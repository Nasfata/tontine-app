# Projet Tontine (DigiLab) : contexte pour l'assistant

## Le projet
Application de gestion de tontines. L'app ne manipule jamais d'argent : elle sert à
déclarer, prouver (photo) et valider des paiements faits en dehors (mobile money, cash).

## Stack
- Base : MySQL (schéma dans database/schema.sql, NE PAS modifier sans me demander)
- Backend : Node.js + Express + mysql2 (promise) + JWT + bcryptjs, dossier backend/
- App : React Native + Expo + Expo Router + TypeScript, dossier mobile/
- Le MÊME code doit fonctionner sur mobile (Expo Go) ET sur web. Toujours vérifier
  qu'une bibliothèque est compatible web avant de l'utiliser, sinon proposer une alternative.

## Structure
- backend/routes/*.js (routes), backend/middleware/auth.js (vérifie le JWT, remplit req.utilisateurId)
- mobile/src/app/ : écrans (Expo Router, un fichier = un écran). Ne pas utiliser mobile/app/
- mobile/src/config.ts : exporte API_URL (localhost sur web, IP du PC sur mobile)
- Tables de MA partie : Role, Utilisateur, Tontine, Participation.
  Les tables Tour et Cotisation appartiennent à d'autres personnes de l'équipe : ne pas y toucher.

## Règles métier
- Un utilisateur n'a AUCUN rôle global. Le rôle est stocké par tontine dans Participation.role_code.
- Il devient 'gerant' des tontines qu'il crée et 'membre' de celles où on l'ajoute.
- Statut d'une tontine à la création : 'en_preparation'.
- Fréquences autorisées : quotidien, hebdomadaire, mensuel.
- La durée du cycle n'est PAS stockée : elle se calcule (nombre_membres x fréquence).
- Un utilisateur sans tontine voit un écran d'accueil avec 2 actions : "Créer une tontine" / "Rejoindre une tontine".
- Le gérant ne voit jamais la liste de tous les utilisateurs de l'app.

## Règles de code (IMPORTANT : je suis débutant)
- COMMENTE CHAQUE LIGNE ou bloc de code en français, de façon simple et pédagogique.
- Noms de variables, fonctions et messages d'erreur en français.
- Requêtes SQL toujours paramétrées avec des "?" (jamais de concaténation).
- Backend : try/catch partout, codes HTTP corrects, réponses JSON { erreur: "..." } en cas d'échec.
- Ne jamais renvoyer mot_de_passe_hash au client.
- Ne jamais committer .env, node_modules ni uploads.
- Petits changements : ne modifie que les fichiers nécessaires à la tâche.

## Design
- Le design de l'app suit DESIGN.md (mobile/DESIGN.md), issu de l'app InvoiceEase.
  Ne pas inventer d'autres couleurs ni composants : réutiliser ceux du guide.

## Fin de chaque tâche
Indique-moi : 1) les fichiers créés/modifiés, 2) les commandes à lancer (npm install...),
3) comment tester pas à pas, 4) les erreurs probables.