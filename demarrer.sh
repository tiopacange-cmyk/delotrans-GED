#!/bin/bash
# Démarrage de DELOTRANS GED dans Codespaces (ou sur un poste de développement)
cd "$(dirname "$(readlink -f "$0")")"
RACINE="$(pwd)"

pkill -f "artisan serve" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "queue:work" 2>/dev/null
pkill -f "schedule:work" 2>/dev/null
sleep 1

# Nouvelles tables éventuelles (sans toucher aux données)
(cd delotrans-ged && php artisan migrate --force > /tmp/migrate.log 2>&1) || echo "Migration en échec -> voir /tmp/migrate.log"

demarrer_api() {
  (cd "$RACINE/delotrans-ged" && nohup php artisan serve --host=127.0.0.1 --port=8000 > /tmp/laravel.log 2>&1 &)
}
demarrer_api
(cd delotrans-ged && nohup php artisan queue:work --sleep=3 --tries=1 > /tmp/queue.log 2>&1 &)
(cd delotrans-ged && nohup php artisan schedule:work > /tmp/schedule.log 2>&1 &)
# L'interface relaie /api vers l'API (voir vite.config.js) : seul le port 5173 est exposé
(cd delotrans-mvp-frontend && VITE_API_URL=/api/v1 nohup npm run dev -- --host > /tmp/vite.log 2>&1 &)
sleep 5

if [ -n "$CODESPACE_NAME" ]; then
  for i in 1 2 3 4 5 6; do gh codespace ports visibility 5173:public -c "$CODESPACE_NAME" > /dev/null 2>&1 && break; sleep 5; done
  ADRESSE="https://${CODESPACE_NAME}-5173.app.github.dev"
else
  ADRESSE="http://localhost:5173"
fi

# ===== Bilan de démarrage =====
sleep 2
if ! curl -s -o /dev/null http://127.0.0.1:8000/up; then
  echo "L'API ne répond pas, nouvelle tentative…"
  demarrer_api
  sleep 5
fi
echo ""
echo "===== BILAN ====="
curl -s -o /dev/null http://127.0.0.1:8000/up && echo "API               : OK" || echo "API               : EN PANNE -> voir /tmp/laravel.log"
curl -s -o /dev/null http://localhost:5173 && echo "Interface         : OK" || echo "Interface         : EN PANNE -> voir /tmp/vite.log"
curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" http://localhost:5173/api/v1/auth/me | grep -q 401 && echo "Relais /api       : OK" || echo "Relais /api       : EN PANNE -> voir /tmp/vite.log"
pgrep -f "queue:work" > /dev/null && echo "Worker            : OK" || echo "Worker            : EN PANNE -> voir /tmp/queue.log"
if [ -n "$CODESPACE_NAME" ]; then
  gh codespace ports -c "$CODESPACE_NAME" 2>/dev/null | grep -q "5173.*public" && echo "Port public       : OK" || echo "Port public       : NON -> relancer le script"
fi
echo ""
echo "Application : $ADRESSE"
