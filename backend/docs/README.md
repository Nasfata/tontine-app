# Documentation du backend (modules 3, 4 et 5)

Ces documents décrivent ce qui a été ajouté par Mohamed Anzize Sihamoudine.

| Document | Contenu |
|---|---|
| [module-4-beneficiaires.md](module-4-beneficiaires.md) | Ordre de passage, démarrage de la tontine, calendrier des tours |
| [module-3-cotisations.md](module-3-cotisations.md) | Consultation des cotisations, déclaration de paiement, preuves, validation |

## Règle fondamentale

L'application **ne transfère jamais d'argent**. Elle permet de déclarer un paiement fait en dehors (Mobile Money, espèces), de joindre une preuve, et au gérant de le valider ou de le refuser.

## Architecture

Ces modules suivent l'architecture en couches décrite dans `backend/AGENTS.MD` : **routes → contrôleurs → services → dépôts**. Une couche ne parle qu'à celle du dessous, et Prisma n'est importé que dans les dépôts.

| Couche | Module 4 (bénéficiaires) | Module 3 (cotisations) |
|---|---|---|
| Routes | `routes/beneficiaires.routes.js` | `routes/cotisations.routes.js` |
| Contrôleur | `controleurs/beneficiaires.controleur.js` | `controleurs/cotisations.controleur.js` |
| Service | `services/beneficiaires.service.js` | `services/cotisations.service.js` |
| Dépôt | `depots/beneficiaires.depot.js` | `depots/cotisations.depot.js` |
| Middleware | | `middleware/recevoirPreuve.js` (réception de la photo de preuve) |

Fichiers partagés par les deux modules :
- `utils/validation.js` : lecture des identifiants et des dates ;
- `utils/stockagePreuves.js` : fichiers de preuve (disque) ;
- `depots/tontines.depot.js` (`trouverRole`, `trouverParticipation`) : rôle d'une personne dans une tontine ;
- `erreurs/erreursMetier.js` : `DonneesInvalides` (400), `Interdit` (403), `NonTrouve` (404), `Conflit` (409).

Les deux routeurs sont branchés sous `/api/tontines` dans `routes/index.js`.

## Conventions de l'API

- Toutes les routes décrites ici exigent un jeton : `Authorization: Bearer <jeton>`.
- Les champs JSON sont en `snake_case`.
- En cas d'échec, la réponse est `{ "erreur": "message en français" }` avec le code HTTP adapté.
- Les montants (type `Decimal` côté base) sont renvoyés sous forme de **texte** (`"5000"`).
- Les dates sont au format `AAAA-MM-JJ` et calculées en UTC.
- Le rôle est propre à chaque tontine (`Participation.roleCode`) : un utilisateur peut être gérant d'une tontine et membre d'une autre.
- Pour ne pas révéler quelles tontines existent, une tontine inexistante et une tontine où l'on ne participe pas donnent la même réponse : **403**.

## Transactions et concurrence

- La définition de l'ordre et le démarrage de la tontine s'exécutent dans une transaction qui **verrouille d'abord la ligne de la tontine** (`SELECT ... FOR UPDATE`). Deux appels simultanés sont ainsi traités l'un après l'autre. Ce choix remplace le niveau d'isolation `Serializable`, que la base de production pourrait ne pas supporter (TiDB).
- Les déclarations et décisions sur une cotisation utilisent une écriture conditionnelle (`updateMany` avec le statut attendu dans la condition) : si deux appels arrivent ensemble, un seul modifie la ligne, l'autre reçoit 409.
- Le verrou n'a été testé que sur MySQL.

## Tests automatiques

Les tests démarrent le vrai serveur sur une **base séparée** (`tontine_test`), jamais sur la base de développement. Ils créent leurs propres comptes avec des numéros aléatoires et peuvent donc être relancés autant de fois que nécessaire. Les preuves de paiement qu'ils créent sont rangées dans un dossier temporaire, supprimé à la fin.

| Fichier | Fonctionnalité | Tests |
|---|---|---|
| `tests/beneficiaires.test.js` | 4.1 Ordre de passage | 20 |
| `tests/demarrage.test.js` | 4.2 Démarrage et calendrier | 19 |
| tests/remise.test.js | 4.3 Remise de la cagnotte | 19 |
| `tests/cotisations.test.js` | 3.1 et 3.4 Consultation, historique, retards | 18 |
| `tests/declaration.test.js` | 3.2 Déclaration de paiement | 23 |
| `tests/preuve.test.js` | Consultation d'une preuve | 11 |
| `tests/validation.test.js` | 3.3 Valider ou refuser un paiement | 19 |
| **Total** | | **129** |

`tests/outils.js` contient les outils partagés (démarrage du serveur, création de comptes et de tontines, envoi de requêtes).

`tests/nonRegression.test.js` (8 tests, écrit lors du refactor en couches) est indépendant : il appelle un serveur déjà lancé sur `http://localhost:3000` (`npm run dev`) et utilise la base de développement.

### Préparation (une seule fois)

1. Créer la base `tontine_test` (par exemple avec `CREATE DATABASE tontine_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`).
2. Ajouter dans `backend/.env` :
   `DATABASE_URL_TEST="mysql://utilisateur:motdepasse@127.0.0.1:3306/tontine_test"`
3. Appliquer les migrations sur cette base : définir temporairement `DATABASE_URL` vers `tontine_test`, puis `npx prisma migrate deploy` et `node prisma/seed.js`.

### Lancement, depuis `backend/`

```
node --test tests/beneficiaires.test.js tests/demarrage.test.js tests/cotisations.test.js tests/declaration.test.js tests/preuve.test.js tests/validation.test.js tests/remise.test.js
```

Les fichiers de tests tournent en parallèle sans problème depuis que l'ajout de membre n'utilise plus `Serializable`. Si des erreurs 500 apparaissent de façon aléatoire, ajouter `--test-concurrency=1` pour les exécuter un par un.

Les tests refusent de s'exécuter si `DATABASE_URL_TEST` est absent, identique à `DATABASE_URL`, ou si le nom de la base ne contient pas « test ».

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base utilisée par le serveur et par Prisma |
| `DATABASE_URL_TEST` | Base utilisée uniquement par les tests |
| `JWT_SECRET` | Clé de signature des jetons de connexion |
| `PREUVES_DOSSIER` | (facultative) dossier des preuves de paiement ; par défaut `backend/preuves/` |