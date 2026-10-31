# Projet Tontine (DigiLab) : contexte pour l'assistant

## Le projet
Application de gestion de tontines. L'app ne manipule jamais d'argent : elle sert à
déclarer, prouver (photo) et valider des paiements faits en dehors (mobile money, cash).

## Stack
- Base : MySQL (schéma dans database/schema.sql, NE PAS modifier sans me demander)
- Backend : Node.js + Express + JWT + bcryptjs, dossier backend/
  Garder la technologie d'accès à la base utilisée aujourd'hui (ne pas passer de mysql2 à Prisma, ni l'inverse).
- App : React Native + Expo + Expo Router + TypeScript, dossier mobile/
- Le MÊME code doit fonctionner sur mobile (Expo Go) ET sur web. Toujours vérifier
  qu'une bibliothèque est compatible web avant de l'utiliser, sinon proposer une alternative.

## Architecture du backend : en couches
Règle de dépendance : Routes -> Contrôleurs -> Services -> Repositories.
Une couche ne parle qu'à celle du dessous, jamais l'inverse, jamais de saut de couche.
Le détail complet (structure, règles par couche, vérification) est dans backend/AGENTS.md : le lire avant toute tâche backend.

```
backend/
├── server.js                  démarrage uniquement (écoute du port)
├── app.js                     app Express, middlewares globaux, branchement des routes
├── config/baseDeDonnees.js    connexion à la base
├── routes/                    chemins HTTP uniquement (*.routes.js)
├── controleurs/               lit req, appelle un service, renvoie res (*.controleur.js)
├── services/                  règles métier, sans req/res (*.service.js)
├── repositories/              seul endroit qui parle à la base (*.repository.js)
├── middleware/                verifierAuthentification.js (vérifie le JWT, remplit req.utilisateurId), gestionErreurs.js
├── erreurs/erreursMetier.js   erreurs métier (NonTrouve, Interdit, DonneesInvalides...)
├── tests/                     tests de non-régression
└── utils/, uploads/
```

## Structure mobile
- mobile/src/app/ : écrans (Expo Router, un fichier = un écran). Ne pas utiliser mobile/app/
- mobile/src/config.ts : exporte API_URL (localhost sur web, IP du PC sur mobile)
- Tables de MA partie : Role, Utilisateur, Tontine, Participation.
  Les tables Tour et Cotisation appartiennent à d'autres personnes de l'équipe : ne pas y toucher
  (ne pas créer de repository ni de service pour elles).

## Règles métier
- Un utilisateur n'a AUCUN rôle global. Le rôle est stocké par tontine dans Participation.role_code.
- Il devient 'gerant' des tontines qu'il crée et 'membre' de celles où on l'ajoute.
- Statut d'une tontine à la création : 'en_preparation'.
- Fréquences autorisées : quotidien, hebdomadaire, mensuel.
- La durée du cycle n'est PAS stockée : elle se calcule (nombre_membres x fréquence).
- Un utilisateur sans tontine voit un écran d'accueil avec 2 actions : "Créer une tontine" / "Rejoindre une tontine".
- Le gérant ne voit jamais la liste de tous les utilisateurs de l'app.

## Règles de code (IMPORTANT : je suis débutant)
- COMMENTE CHAQUE bloc de code en français, de façon simple et pédagogique,
  et mets un commentaire en haut de chaque fichier pour expliquer son rôle.
- Noms de variables, fonctions, fichiers et messages d'erreur en français
  (ex. creerTontine, rejoindreTontine, trouverUtilisateurParEmail).
- Chaque couche respecte son rôle :
  - routes : chemins et middleware d'auth, aucune logique ;
  - contrôleurs : lisent req, appellent UN service, renvoient la réponse, aucune règle métier ;
  - services : toutes les règles métier, aucun req/res, aucun accès direct à la base, lèvent des erreurs de erreursMetier.js ;
  - repositories : seul endroit qui exécute des requêtes, aucune règle métier.
- Requêtes SQL toujours paramétrées avec des "?" (jamais de concaténation).
- Backend : try/catch partout, codes HTTP corrects, réponses JSON { erreur: "..." } en cas d'échec.
- Ne jamais renvoyer mot_de_passe_hash au client.
- Ne jamais committer .env, node_modules ni uploads.
- Petits changements : ne modifie que les fichiers nécessaires à la tâche
  (exception : le refactor en couches du backend, qui suit backend/AGENTS.md).
- Ne pas changer les URLs, formats de requête/réponse ni codes HTTP : mobile/src/api.ts ne doit pas être modifié.

## Design
- Le design de l'app suit DESIGN.md (mobile/DESIGN.md), issu de l'app InvoiceEase.
  Ne pas inventer d'autres couleurs ni composants : réutiliser ceux du guide.

## Fin de chaque tâche
Indique-moi : 1) les fichiers créés/modifiés, 2) les commandes à lancer (npm install...),
3) comment tester pas à pas, 4) les erreurs probables,
5) le résultat des tests lancés, et ce qui n'a pas pu être testé et pourquoi.