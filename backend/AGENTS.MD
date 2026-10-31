# Backend Tontine : architecture en couches

Backend Node.js + Express, accès base de données via Prisma (MySQL).

## Règle de dépendance
Routes -> Contrôleurs -> Services -> Dépôts.
Une couche ne parle qu'à celle du dessous. Jamais l'inverse, jamais de saut de couche.

## Structure à respecter

```
backend/
├── server.js                      démarrage uniquement (écoute du port)
├── app.js                         création de l'app Express, middlewares globaux, branchement des routes
├── config/
│   └── baseDeDonnees.js           instance Prisma
├── routes/                        présentation : chemins HTTP uniquement
│   ├── index.js                   regroupe les routes sous /api
│   ├── auth.routes.js
│   ├── contacts.routes.js
│   ├── profil.routes.js
│   └── tontines.routes.js
├── controleurs/                   présentation : lit req, appelle un service, renvoie res
│   ├── auth.controleur.js
│   ├── contacts.controleur.js
│   ├── profil.controleur.js
│   └── tontines.controleur.js
├── services/                      métier : règles et logique, sans req/res
│   ├── auth.service.js
│   ├── contacts.service.js
│   ├── profil.service.js
│   └── tontines.service.js
├── depots/                        accès aux données : seul endroit qui importe Prisma
│   ├── utilisateurs.depot.js
│   ├── contacts.depot.js
│   └── tontines.depot.js
├── middleware/
│   ├── verifierAuthentification.js
│   └── gestionErreurs.js
├── erreurs/
│   └── erreursMetier.js           NonTrouve, Interdit, DonneesInvalides, etc.
├── tests/
│   └── nonRegression.test.js      vérifie que l'API répond comme avant
├── utils/
├── prisma/                        inchangé
└── uploads/                       inchangé
```

## Règles par couche
1. **Routes** : uniquement les chemins et le middleware d'auth. Aucune logique.
2. **Contrôleurs** : extraire les paramètres de req, appeler UN service, renvoyer la réponse avec le bon code HTTP. Aucune règle métier, aucun Prisma.
3. **Services** : toutes les règles métier (validations, droits, limites de membres, calculs). Ils ne connaissent ni req ni res et lèvent des erreurs de `erreursMetier.js`. Aucun Prisma.
4. **Dépôts** : seul endroit où Prisma est importé. Une fonction par requête (ex. `trouverParId`, `creer`, `ajouterMembre`). Aucune règle métier.
5. **gestionErreurs.js** : transforme les erreurs métier en réponses HTTP (400, 403, 404...).

## Conventions
- Fonctions nommées en français et explicitement (`creerTontine`, `rejoindreTontine`, `trouverUtilisateurParEmail`).
- Un commentaire d'une ligne en français en haut de chaque fichier pour expliquer son rôle.
- Toute nouvelle fonctionnalité suit le même schéma : routes, contrôleur, service, dépôt.

## Vérification : tout doit marcher comme avant
Le refactor ne doit changer AUCUN comportement visible. Il faut le prouver, pas le supposer.

1. **Avant de modifier le code**, recense chaque route existante (méthode, URL, authentification requise, corps attendu) et note pour chacune la réponse actuelle : code HTTP et structure du JSON (noms des champs et types). Enregistre ce relevé dans `tests/nonRegression.test.js`.
2. **Écris `tests/nonRegression.test.js`** avec `node:test` et `fetch`, qui sont intégrés à Node : aucune dépendance à ajouter. Le test doit couvrir au minimum :
   - inscription, connexion, accès refusé sans token ou avec un token invalide ;
   - lecture et modification du profil, envoi de la photo ;
   - liste des contacts, ajout d'un contact ;
   - création d'une tontine, liste des tontines, détail d'une tontine ;
   - rejoindre une tontine, et les cas d'erreur (tontine pleine, déjà membre, tontine introuvable, droits insuffisants).
3. **Lance les tests AVANT le refactor** pour confirmer qu'ils passent sur le code d'origine. Un test qui échoue avant ne prouve rien.
4. **Après chaque module migré** (auth, profil, contacts, tontines), relance TOUS les tests ainsi que `node server.js` pour vérifier que le serveur démarre. Ne passe pas au module suivant si un test échoue.
5. **À la fin**, relance toute la suite et vérifie que les codes HTTP et la structure des réponses sont identiques au relevé initial.
6. Utilise une base de test ou des données jetables. Ne jamais lancer les tests sur la base de production.
7. Si un test ne peut pas être exécuté (base de données inaccessible, réseau coupé, variable d'environnement manquante), dis-le explicitement. N'affirme jamais que « tout fonctionne » sans l'avoir exécuté.
8. Si un comportement semble être un bug dans le code d'origine, ne le corrige pas : reproduis-le à l'identique et signale-le séparément.

## Compte rendu final
Termine toujours par :
- l'arbre final des dossiers ;
- la liste des fichiers déplacés ou renommés ;
- le résultat des tests (nombre de tests réussis ou échoués) ;
- ce qui n'a pas pu être testé et pourquoi ;
- les choix que tu as dû faire.

## Interdits
- Ne pas changer les URLs, les formats de requête/réponse ni les codes HTTP : le frontend (`mobile/src/api.ts`) ne doit pas être modifié.
- Ne pas toucher au dossier `mobile/`.
- Ne pas ajouter de dépendances ni modifier le schéma Prisma.
- Ne pas supprimer les anciens fichiers tant que les tests ne passent pas.