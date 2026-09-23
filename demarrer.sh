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
