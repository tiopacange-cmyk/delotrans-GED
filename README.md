# DELOTRANS GED

Gestion électronique de documents : API Laravel (`delotrans-ged/`) et interface React (`delotrans-mvp-frontend/`).

## Démarrer dans GitHub Codespaces (tests)

```bash
git pull
bash demarrer.sh
```

Le script lance l'API, la file d'attente, les tâches planifiées et l'interface, puis affiche un bilan
et l'adresse à partager. Seul le port 5173 est rendu public : l'interface relaie elle-même les appels à l'API.

Le Codespace s'arrête après une période d'inactivité ; il faut alors le rouvrir et relancer `bash demarrer.sh`.

## Mettre en ligne sur un serveur (24 h/24)

Voir [`deploiement/LISEZMOI.md`](deploiement/LISEZMOI.md).
Attention : le script est prévu pour un serveur **dédié** à DELOTRANS GED.

## Tests

```bash
cd delotrans-ged && php artisan test
```

Ils tournent aussi automatiquement sur GitHub à chaque envoi de code.
