# ELIMU — Portail propriétaire

Dépôt autonome du tableau propriétaire ELIMU.

Le portail s’ouvre depuis `index.html`, utilise son propre dossier `assets/` et consulte les données publiées par Apps Script en lecture seule. L’accès commence par un scan QR : le contenu décodé est placé dans le champ du code, puis l’utilisateur valide manuellement. La saisie manuelle reste disponible.

Le script Apps Script doit contenir la propriété privée `OWNER_TOKEN`. Le QR doit contenir exactement cette valeur (ou une URL/JSON contenant `ownerToken`, `token` ou `code`). Après modification de `Owner.gs`, redéployer Apps Script.

Le fichier `config.js` contient l’URL Apps Script de l’établissement.

Le portail est installable comme PWA. Avant chaque hébergement client,
remplacer `assets/school-logo.png` par le logo de l’établissement : ce fichier
sert de favicon, d’icône PWA, d’icône d’en-tête et de logo de connexion.

Après la connexion, le tableau de bord est actualisé automatiquement à 06:00,
08:00, 10:00, 12:00, 14:00, 16:00 et 18:00. Une ouverture du portail provoque
toujours une lecture immédiate, puis les lectures suivantes suivent ces créneaux.
