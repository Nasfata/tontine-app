# Documentation du backend (modules 3, 4 et 5)

Ces documents décrivent ce qui a été ajouté par Mohamed Anzize Sihamoudine (branche `feature/anzize`).

| Document | Contenu |
|---|---|
| [module-4-beneficiaires.md](module-4-beneficiaires.md) | Ordre de passage, démarrage de la tontine, calendrier des tours |
| [module-3-cotisations.md](module-3-cotisations.md) | Consultation des cotisations, déclaration de paiement, preuves |

## Règle fondamentale

L'application **ne transfère jamais d'argent**. Elle permet de déclarer un paiement fait en dehors (Mobile Money, espèces), de joindre une preuve, et au gérant de le valider ou de le refuser.

## Conventions de l'API

- Toutes les routes décrites ici exigent un jeton : `Authorization: Bearer <jeton>`.
- Les champs JSON sont en `snake_case`.
- En cas d'échec, la réponse est `{ "erreur": "message en français" }` avec le code HTTP adapté.
- Les montants (type `Decimal` côté base) sont renvoyés sous forme de **texte** (`"5000"`).
- Les dates sont au format `AAAA-MM-JJ` et calculées en UTC.
- Le rôle est propre à chaque tontine (`Participation.roleCode`) : un utilisateur peut être gérant d'une tontine et membre d'une autre.
- Pour ne pas révéler quelles tontines existent, une tontine inexistante et une tontine où l'on ne participe pas donnent la même réponse : **403**.

## Tests automatiques

Les tests démarrent le vrai serveur sur une **base séparée** (`tontine_test`), jamais sur la base de développement. Ils créent leurs propres comptes avec des numéros aléatoires et peuvent donc être relancés autant de fois que nécessaire. Les preuves de paiement qu'ils créent sont rangées dans un dossier temporaire, supprimé à la fin.

| Fichier | Fonctionnalité | Tests |
|---|---|---|
| `tests/beneficiaires.test.js` | 4.1 Ordre de passage | 20 |
| `tests/demarrage.test.js` | 4.2 Démarrage et calendrier | 19 |
| `tests/cotisations.test.js` | 3.1 et 3.4 Consultation, historique, retards | 18 |
| `tests/declaration.test.js` | 3.2 Déclaration de paiement | 23 |
| `tests/preuve.test.js` | Consultation d'une preuve | 11 |
| `tests/validation.test.js` | 3.3 Valider ou refuser un paiement | 19 |

`tests/outils.js` contient les outils partagés (démarrage du serveur, création de comptes et de tontines, envoi de requêtes).

### Préparation (une seule fois)

1. Créer la base `tontine_test` (par exemple avec `CREATE DATABASE tontine_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`).
2. Ajouter dans `backend/.env` :
   `DATABASE_URL_TEST="mysql://utilisateur:motdepasse@127.0.0.1:3306/tontine_test"`
3. Appliquer les migrations sur cette base : définir temporairement `DATABASE_URL` vers `tontine_test`, puis `npx prisma migrate deploy` et `npm run prisma:seed`.

### Lancement, depuis `backend/`

```
node --test --test-concurrency=1
```

`--test-concurrency=1` est nécessaire : les fichiers de tests partagent une même base et l'ajout de membre (transaction `Serializable`) peut échouer si deux fichiers tournent en même temps.

Les tests refusent de s'exécuter si `DATABASE_URL_TEST` est absent, identique à `DATABASE_URL`, ou si le nom de la base ne contient pas « test ».

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base utilisée par le serveur et par Prisma |
| `DATABASE_URL_TEST` | Base utilisée uniquement par les tests |
| `JWT_SECRET` | Clé de signature des jetons de connexion |
| `PREUVES_DOSSIER` | (facultative) dossier des preuves de paiement ; par défaut `backend/preuves/` |