#!/bin/bash
# =====================================================================
#  Installation / mise à jour de DELOTRANS GED sur un serveur Ubuntu
#  (Oracle Cloud Always Free ou tout autre serveur Ubuntu 22.04 / 24.04)
#
#  Usage :
#     sudo bash installer-serveur.sh                  -> accès par l'IP (http)
#     sudo DOMAINE=ged.exemple.fr EMAIL=moi@exemple.fr bash installer-serveur.sh
#                                                     -> nom de domaine + HTTPS
#
#  Variables facultatives :
#     BRANCHE   branche Git à installer (défaut : main)
#     DEPOT     adresse du dépôt Git
#
#  Relancer le script met l'application à jour (code, dépendances, base).
# =====================================================================
set -euo pipefail

DEPOT="${DEPOT:-https://github.com/tiopacange-cmyk/delotrans-GED.git}"
BRANCHE="${BRANCHE:-main}"
DOMAINE="${DOMAINE:-}"
EMAIL="${EMAIL:-}"
DOSSIER=/var/www/delotrans
API="$DOSSIER/delotrans-ged"
FRONT="$DOSSIER/delotrans-mvp-frontend"
PHP=8.4

etape() { echo; echo "===== $1 ====="; }

[ "$(id -u)" -eq 0 ] || { echo "Lancer avec sudo."; exit 1; }
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------
etape "1/8 Logiciels (PHP $PHP, nginx, Node 22, Composer)"
apt-get update -qq
apt-get install -y -qq software-properties-common curl git unzip sqlite3 ca-certificates gnupg
if ! apt-cache show "php$PHP-fpm" >/dev/null 2>&1; then
  add-apt-repository -y ppa:ondrej/php
  apt-get update -qq
fi
apt-get install -y -qq nginx "php$PHP-fpm" "php$PHP-cli" "php$PHP-sqlite3" "php$PHP-mbstring" \
  "php$PHP-xml" "php$PHP-curl" "php$PHP-zip" "php$PHP-bcmath" "php$PHP-intl"

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
if ! command -v composer >/dev/null; then
  curl -fsSL https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

# Dépôt de fichiers jusqu'à 100 Mo (limite de l'application)
cat > "/etc/php/$PHP/fpm/conf.d/99-delotrans.ini" <<EOF
upload_max_filesize = 100M
post_max_size = 110M
memory_limit = 256M
EOF

# ---------------------------------------------------------------------
etape "2/8 Code source (branche $BRANCHE)"
if [ -d "$DOSSIER/.git" ]; then
  git -C "$DOSSIER" fetch -q origin "$BRANCHE"
  git -C "$DOSSIER" checkout -q "$BRANCHE"
  git -C "$DOSSIER" reset -q --hard "origin/$BRANCHE"
  PREMIERE_INSTALLATION=non
else
  git clone -q --branch "$BRANCHE" "$DEPOT" "$DOSSIER"
  PREMIERE_INSTALLATION=oui
fi

# ---------------------------------------------------------------------
etape "3/8 API Laravel"
cd "$API"
COMPOSER_ALLOW_SUPERUSER=1 composer install -q --no-dev --optimize-autoloader --no-interaction

if [ -n "$DOMAINE" ]; then URL="https://$DOMAINE"; else URL="http://$(curl -s -4 ifconfig.me || hostname -I | cut -d' ' -f1)"; fi

[ -f .env ] || cp .env.example .env
regler() { # regler CLE valeur : remplace ou ajoute une ligne du .env
  if grep -q "^$1=" .env; then sed -i "s#^$1=.*#$1=$2#" .env; else echo "$1=$2" >> .env; fi
}
regler APP_NAME '"DELOTRANS GED"'
regler APP_ENV production
regler APP_DEBUG false
regler APP_URL "$URL"
regler APP_LOCALE fr
regler LOG_LEVEL warning
regler DB_CONNECTION sqlite
regler DB_DATABASE "$API/database/database.sqlite"
grep -q '^APP_KEY=base64' .env || php artisan key:generate --force

touch database/database.sqlite
php artisan migrate --force
if [ "$PREMIERE_INSTALLATION" = oui ]; then
  # Rôles, permissions et comptes de démo (seulement la première fois :
  # le seeder réaligne les droits des rôles et écraserait vos réglages)
  php artisan db:seed --force
fi
php artisan config:cache
php artisan route:cache

chown -R www-data:www-data storage bootstrap/cache database
chmod -R ug+rwX storage bootstrap/cache database

# ---------------------------------------------------------------------
etape "4/8 Interface React"
cd "$FRONT"
npm ci --silent
# API servie à la même adresse que l'interface : pas de CORS, pas de port à ouvrir
VITE_API_URL=/api/v1 npm run build --silent

# ---------------------------------------------------------------------
etape "5/8 nginx"
NOM_SERVEUR="${DOMAINE:-_}"
cat > /etc/nginx/sites-available/delotrans <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $NOM_SERVEUR;

    root $FRONT/dist;
    index index.html;
    client_max_body_size 110M;

    # API Laravel
    location ~ ^/(api|up)(/|\$) {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $API/public/index.php;
        fastcgi_param DOCUMENT_ROOT $API/public;
        fastcgi_pass unix:/run/php/php$PHP-fpm.sock;
        fastcgi_read_timeout 300;
    }

    # Fichiers de l'interface (noms uniques : cache long)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Application React : toutes les autres adresses -> index.html
    location / {
        try_files \$uri /index.html;
    }
}
EOF
ln -sf /etc/nginx/sites-available/delotrans /etc/nginx/sites-enabled/delotrans
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable -q --now "php$PHP-fpm" nginx
systemctl reload "php$PHP-fpm" nginx

# ---------------------------------------------------------------------
etape "6/8 File d'attente et tâches planifiées"
cat > /etc/systemd/system/delotrans-queue.service <<EOF
[Unit]
Description=DELOTRANS GED - file d'attente (sauvegardes, notifications)
After=network.target

[Service]
User=www-data
WorkingDirectory=$API
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=1 --max-time=3600
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable -q delotrans-queue
systemctl restart delotrans-queue

# Sauvegarde quotidienne, surveillance du NAS…
echo "* * * * * www-data cd $API && php artisan schedule:run >> /dev/null 2>&1" > /etc/cron.d/delotrans

# ---------------------------------------------------------------------
etape "7/8 Pare-feu"
# Les images Ubuntu d'Oracle Cloud bloquent tout sauf SSH dans iptables
if iptables -S INPUT 2>/dev/null | grep -q REJECT; then
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport $port -j ACCEPT 2>/dev/null \
      || iptables -I INPUT 1 -p tcp --dport $port -j ACCEPT
  done
  command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null
fi
if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 'Nginx Full' >/dev/null
fi

# ---------------------------------------------------------------------
etape "8/8 HTTPS"
if [ -n "$DOMAINE" ]; then
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -n --agree-tos --redirect -d "$DOMAINE" ${EMAIL:+-m "$EMAIL"} ${EMAIL:---register-unsafely-without-email}
else
  echo "Pas de nom de domaine : accès en http par l'IP (suffisant pour des tests)."
fi

# ---------------------------------------------------------------------
echo
echo "===== BILAN ====="
curl -s -o /dev/null -w "%{http_code}" http://localhost/up | grep -q 200 && echo "API         : OK" || echo "API         : EN PANNE -> $API/storage/logs/laravel.log"
curl -s http://localhost/ | grep -q '<div id="root">' && echo "Interface   : OK" || echo "Interface   : EN PANNE -> /var/log/nginx/error.log"
systemctl is-active -q delotrans-queue && echo "File d'att. : OK" || echo "File d'att. : EN PANNE -> journalctl -u delotrans-queue"
echo
echo "Adresse : $URL"
if [ "$PREMIERE_INSTALLATION" = oui ]; then
  echo "Comptes de démo : admin@delotrans.fr / utilisateur@delotrans.fr (mot de passe : changeme123)"
  echo ">>> Changez ces mots de passe dès la première connexion. <<<"
fi
