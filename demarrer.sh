#!/bin/bash
# Démarrage de DELOTRANS GED dans Codespaces
cd /workspaces/delotrans-GED

pkill -f "artisan serve" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "queue:work" 2>/dev/null
pkill -f "schedule:work" 2>/dev/null
sleep 1

(cd delotrans-ged && nohup php artisan serve --host=0.0.0.0 --port=8000 > /tmp/laravel.log 2>&1 &)
(cd delotrans-ged && nohup php artisan queue:work --sleep=3 --tries=1 > /tmp/queue.log 2>&1 &)
(cd delotrans-ged && nohup php artisan schedule:work > /tmp/schedule.log 2>&1 &)
(cd delotrans-mvp-frontend && nohup npm run dev -- --host > /tmp/vite.log 2>&1 &)
sleep 5

gh codespace ports visibility 8000:public -c "$CODESPACE_NAME" > /dev/null 2>&1

echo ""
echo "DELOTRANS GED est démarré."
echo "Application : https://${CODESPACE_NAME}-5173.app.github.dev"

# ===== Bilan de démarrage =====
sleep 3
if ! curl -s -o /dev/null http://localhost:8000/up; then
  echo "L'API ne répond pas, nouvelle tentative…"
  (cd /workspaces/delotrans-GED/delotrans-ged && nohup php artisan serve --host=0.0.0.0 --port=8000 > /tmp/laravel.log 2>&1 &)
  sleep 5
  for i in 1 2 3 4 5 6; do gh codespace ports visibility 8000:public 5173:public -c "$CODESPACE_NAME" > /dev/null 2>&1 && break; sleep 5; done
fi
echo ""
echo "===== BILAN ====="
curl -s -o /dev/null http://localhost:8000/up && echo "API (8000)        : OK" || echo "API (8000)        : EN PANNE -> voir /tmp/laravel.log"
curl -s -o /dev/null http://localhost:5173 && echo "Interface (5173)  : OK" || echo "Interface (5173)  : EN PANNE -> voir /tmp/vite.log"
pgrep -f "queue:work" > /dev/null && echo "Worker            : OK" || echo "Worker            : EN PANNE -> voir /tmp/queue.log"
gh codespace ports -c "$CODESPACE_NAME" 2>/dev/null | grep -q "8000.*public" && echo "Port API public   : OK" || echo "Port API public   : NON -> relancer le script"
