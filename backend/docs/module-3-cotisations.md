# Module 3 : cotisations et paiements

Code : `routes/cotisations.js`, `utils/stockagePreuves.js`, `utils/validation.js`.
Tests : `tests/cotisations.test.js`, `tests/declaration.test.js`, `tests/preuve.test.js` , `tests/validation.test.js`.

## Principe

Les cotisations sont créées au démarrage de la tontine (voir module 4). Un membre **déclare** avoir payé hors de l'application, avec une photo facultative ; le gérant examine la preuve, puis valide ou refuse. Aucun argent ne circule dans l'application.

## Statuts d'une cotisation

| Statut | Signification | Qui le met |
|---|---|---|
| `non_paye` | À payer (état initial) | Démarrage de la tontine |
| `en_attente` | Déclarée, en attente de validation | Le membre |
| `paye` | Validée | Le gérant |
| `refuse` | Refusée : le membre doit recotiser | Le gérant |

Le **retard n'est pas un statut stocké** : une cotisation est `en_retard` quand elle est `non_paye` ou `refuse` et que son échéance est antérieure à aujourd'hui. Il est calculé à chaque lecture, donc jamais périmé. Une cotisation `en_attente` ou `paye` n'est jamais en retard.

## `GET /api/tontines/:id/cotisations`

Liste des cotisations. Un **membre** voit uniquement les siennes ; le **gérant** voit toutes celles de la tontine. Triées par échéance, puis par nom.

Filtres facultatifs :

| Paramètre | Valeurs |
|---|---|
| `utilisateur_id` | identifiant d'un membre (un membre ne peut demander que le sien, sinon 403) |
| `statut` | `non_paye`, `en_attente`, `paye`, `refuse` |
| `en_retard` | `true` ou `false` |

Réponse 200 :

```json
{
  "tontine_id": 4,
  "cotisations": [
    {
      "cotisation_id": 31,
      "tour_numero": 1,
      "beneficiaire": { "utilisateur_id": 12, "nom": "Awa" },
      "membre": { "utilisateur_id": 7, "nom": "Moussa" },
      "montant": "5000",
      "date_echeance": "2026-11-30",
      "date_paiement": null,
      "statut": "non_paye",
      "en_retard": false,
      "preuve_disponible": false,
      "note_refus": null
    }
  ]
}
```

`preuve_disponible` indique seulement si une preuve existe : le nom du fichier n'est jamais exposé. Avant le démarrage de la tontine, la liste est vide.

| Code | Cas |
|---|---|
| 400 | Identifiant ou filtre invalide |
| 403 | Non participant, ou tontine inexistante ; membre qui demande les cotisations d'un autre |

## `POST /api/tontines/:id/cotisations/:cotisationId/declaration`

Le membre déclare son paiement. Format `multipart/form-data` avec un fichier **facultatif** dans le champ `preuve` ; sans fichier (paiement en main propre), une requête vide suffit.

Règles :
- Seul le **propriétaire** de la cotisation peut la déclarer (le gérant ne déclare pas à la place d'un membre).
- La tontine doit être `actif`.
- Statuts autorisés au départ : `non_paye` ou `refuse`.
- La preuve est une image **JPEG, PNG ou WebP** de 5 Mo maximum. Le type est vérifié sur les **premiers octets** du fichier, pas sur son nom ni sur le type annoncé par le client.
- La déclaration passe le statut à `en_attente`, enregistre la date du jour dans `date_paiement`, et efface l'ancien motif de refus. Une nouvelle déclaration **remplace** la précédente : l'ancienne preuve est supprimée, même si la nouvelle déclaration n'en contient pas.
- Deux clics simultanés : une seule déclaration est acceptée (l'autre reçoit 409) et un seul fichier est conservé.
- Si une vérification échoue, aucun fichier n'est écrit sur le disque.

Réponse 200 : la cotisation mise à jour (même forme qu'un élément de la liste).

| Code | Cas |
|---|---|
| 400 | Identifiant invalide ; fichier qui n'est pas une image JPEG/PNG/WebP ; fichier de plus de 5 Mo ; mauvais champ ou plusieurs fichiers |
| 403 | Non participant, ou tontine inexistante |
| 404 | Cotisation inexistante, d'un autre membre ou d'une autre tontine (même réponse pour ne rien révéler) |
| 409 | Tontine non active ; cotisation déjà `en_attente` ou `paye` |

## `GET /api/tontines/:id/cotisations/:cotisationId/preuve`

Renvoie l'**image** de la preuve (octets), avec `Content-Type` selon le fichier, `X-Content-Type-Options: nosniff` et `Cache-Control: private, no-store`.

Accessible au **propriétaire** de la cotisation et au **gérant** de la tontine, à personne d'autre.

| Code | Cas |
|---|---|
| 400 | Identifiant invalide |
| 403 | Non participant, ou tontine inexistante |
| 404 | « Preuve introuvable » (cotisation inexistante, d'un autre membre, ou sans preuve) ; « Le fichier de la preuve n'est plus disponible » (fichier absent du disque) |

Le jeton est lu dans l'en-tête `Authorization` : côté web, l'application doit télécharger l'image avec la requête authentifiée puis l'afficher, car une balise `<img>` ne peut pas envoyer d'en-tête.

## Stockage des preuves

- Les fichiers sont rangés dans `backend/preuves/` (ou `PREUVES_DOSSIER`), **hors de `uploads/`** qui est public. Ce dossier est ignoré par Git (`backend/.gitignore`).
- Le nom est fabriqué par le serveur : `cot-<id de la cotisation>-<horodatage>.<extension>`. La colonne `Cotisation.preuveUrl` contient ce **nom de fichier**, pas une URL.
- La lecture n'utilise que le nom du fichier (sans chemin) : une valeur piégée comme `../../.env` ne permet jamais de sortir du dossier des preuves.
- Toute la gestion des fichiers est dans `utils/stockagePreuves.js`. Si l'équipe adopte un stockage externe, seul ce fichier est à remplacer.

## Limites et décisions en attente

- **Stockage sur disque et hébergement.** Sur un hébergeur à disque éphémère (comme Render sans disque persistant), les fichiers sont perdus à chaque redéploiement alors que la base garde leur nom. La route de consultation signale alors proprement « plus disponible ». Choix du stockage à décider avec l'équipe.
- **Pas de montant déclaré ni de référence de paiement en V1** : `Cotisation` n'a pas ces colonnes, et le cahier de scénarios place le rapprochement avec justificatifs en V2.
- **Le gérant peut valider sa propre déclaration**, puisqu'il est aussi membre et seul validateur en V1. Le rôle Trésorier (V2) corrigera ce point.
- Les photos HEIC (iPhone) sont refusées : l'application mobile doit les convertir en JPEG avant l'envoi.

## `POST /api/tontines/:id/cotisations/:cotisationId/validation`

Le gérant valide ou refuse une déclaration de paiement.

```json
{ "decision": "refuser", "note": "montant incorrect" }
```

`decision` vaut `valider` ou `refuser`. `note` est facultatif, réservé au refus, de 500 caractères maximum.

Règles :
- Seul le **gérant** décide. Il peut valider sa propre déclaration (voir les limites).
- Seule une cotisation `en_attente` peut être décidée, dans une tontine `actif`.
- **Valider** : le statut passe à `paye`.
- **Refuser** : le statut passe à `refuse`, le motif est enregistré dans `note_refus`, et `date_paiement` est effacée puisque le paiement n'est pas reconnu. Le membre peut alors redéclarer (voir la déclaration ci-dessus).
- La **preuve est conservée** dans les deux cas : elle reste lisible par le gérant et par le membre, et n'est remplacée qu'à la redéclaration.
- Dans les deux cas, la participation du gérant qui décide est enregistrée dans `Cotisation.valideePar` (c'est un identifiant de **participation**, pas de compte). L'API ne l'expose pas encore.
- Deux décisions simultanées : une seule est acceptée, l'autre reçoit 409.

Réponse 200 : la cotisation mise à jour (même forme qu'un élément de la liste).

| Code | Cas |
|---|---|
| 400 | Identifiant invalide ; décision absente ou inconnue ; motif avec « valider », non textuel ou de plus de 500 caractères |
| 403 | Non participant, tontine inexistante, ou appelant non gérant |
| 404 | Cotisation inexistante ou d'une autre tontine |
| 409 | Tontine non active ; cotisation qui n'est pas `en_attente` (ou décidée en même temps par un autre appel) |

## Cycle de vie complet d'une cotisation

```
non_paye ──déclaration──▶ en_attente ──valider──▶ paye
   ▲                          │
   └──────déclaration─── refuse ◀──refuser──┘
```

Une cotisation `paye` est définitive. Une cotisation `refuse` peut être redéclarée autant de fois que nécessaire.

## À venir

- Utilisation des cotisations `paye` pour la remise de la cagnotte (module 4.3) et pour le tableau de bord (module 5).