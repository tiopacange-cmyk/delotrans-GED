# Mettre DELOTRANS GED en ligne gratuitement

Le script `installer-serveur.sh` installe toute l'application sur un serveur Ubuntu **dédié**
(il remplace le site web par défaut : ne pas l'utiliser sur un serveur qui héberge déjà une autre application) :
interface, API, base SQLite, file d'attente, sauvegarde quotidienne, et HTTPS si vous avez un nom de domaine.
Tout est servi à une seule adresse : pas de port 8000 à ouvrir.

## 1. Créer le serveur gratuit (Oracle Cloud « Always Free »)

1. Créer un compte sur <https://cloud.oracle.com> (une carte bancaire est demandée pour vérifier l'identité ; les ressources « Always Free » ne sont pas facturées).
2. **Compute → Instances → Create instance**
   - Image : **Canonical Ubuntu 24.04**
   - Shape : **VM.Standard.A1.Flex** (ARM, gratuit), 1 OCPU / 6 Go suffisent
     — ou **VM.Standard.E2.1.Micro** si l'ARM n'est pas disponible
   - Télécharger la **clé SSH privée** proposée.
3. **Ouvrir les ports 80 et 443** : page de l'instance → *Subnet* → *Security List* → *Add Ingress Rules*
   - Source `0.0.0.0/0`, protocole TCP, port `80`
   - idem pour le port `443`
   (Le pare-feu interne du serveur est ouvert par le script.)
4. Noter l'**adresse IP publique** de l'instance.

## 2. Installer l'application

Depuis votre ordinateur :

```bash
ssh -i cle-oracle.key ubuntu@IP_DU_SERVEUR
```

Puis sur le serveur :

```bash
curl -fsSLO https://raw.githubusercontent.com/tiopacange-cmyk/delotrans-GED/main/deploiement/installer-serveur.sh
sudo bash installer-serveur.sh
```

Compter 5 à 10 minutes. À la fin, le script affiche un bilan et l'adresse : `http://IP_DU_SERVEUR`.

**Avec un nom de domaine** (recommandé dès que de vrais utilisateurs se connectent) :
faire pointer le domaine vers l'IP (enregistrement DNS de type A), puis :

```bash
sudo DOMAINE=ged.exemple.fr EMAIL=vous@exemple.fr bash installer-serveur.sh
```

Le certificat HTTPS (Let's Encrypt) est obtenu et renouvelé automatiquement.
Un sous-domaine gratuit (DuckDNS, par exemple) convient pour des tests.

## 3. Mettre à jour

Relancer simplement la même commande : le script récupère la dernière version du code,
met à jour les dépendances et la base, et redémarre les services.
Les données (base, documents déposés, sauvegardes) sont conservées.

Pour tester une autre branche : `sudo BRANCHE=nom-de-branche bash installer-serveur.sh`

## Où sont les choses sur le serveur

| Quoi | Où |
|---|---|
| Application | `/var/www/delotrans` |
| Base de données | `/var/www/delotrans/delotrans-ged/database/database.sqlite` |
| Documents déposés | `/var/www/delotrans/delotrans-ged/storage/app/` |
| Journal de l'API | `/var/www/delotrans/delotrans-ged/storage/logs/laravel.log` |
| File d'attente | `sudo systemctl status delotrans-queue` |

## Important

- Comptes créés à la première installation : `admin@delotrans.fr` et `utilisateur@delotrans.fr`,
  mot de passe `changeme123`. **Les changer immédiatement**, le serveur étant public.
- Sans nom de domaine, la connexion se fait en `http` : les mots de passe circulent en clair.
  Acceptable pour une démonstration, pas pour de vrais documents.
