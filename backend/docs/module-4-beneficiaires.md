# Module 4 : gestion des bénéficiaires

Code : `routes/beneficiaires.js`, `utils/validation.js`.
Tests : `tests/beneficiaires.test.js` (ordre de passage), `tests/demarrage.test.js` (démarrage et calendrier).

## Principe

Chaque membre reçoit la cagnotte à son tour. Le gérant fixe l'ordre de passage, puis démarre la tontine : le serveur génère alors un **tour** par membre et les **cotisations** associées.

## 4.1 Ordre de passage

L'ordre est stocké dans `Participation.ordrePassage`. Il forme une suite 1 à N sans trou ni doublon.

Règles :
- Seul le **gérant** de la tontine le définit ; tous les participants peuvent le consulter.
- Il n'est modifiable que tant que la tontine est `en_preparation`.
- La liste envoyée doit contenir **exactement** les membres de la tontine, gérant compris.
- `ordre_defini` est calculé : il vaut `true` seulement si tous les membres ont un ordre formant 1 à N. Il repasse à `false` si un membre est ajouté ou retiré ensuite : le gérant renvoie alors un `PUT` complet.

### `GET /api/tontines/:id/ordre`

Accessible à tout participant. Réponse 200 :

```json
{
  "tontine_id": 4,
  "statut": "en_preparation",
  "ordre_defini": true,
  "membres": [
    { "utilisateur_id": 12, "nom": "Awa", "photo": null, "role_code": "gerant", "ordre_passage": 1 },
    { "utilisateur_id": 7, "nom": "Moussa", "photo": null, "role_code": "membre", "ordre_passage": 2 }
  ]
}
```

Les membres sont triés par ordre de passage ; ceux qui n'en ont pas viennent en dernier, par nom.

| Code | Cas |
|---|---|
| 400 | Identifiant invalide |
| 403 | Non participant, ou tontine inexistante |

### `PUT /api/tontines/:id/ordre`

Réservé au gérant. Remplace tout l'ordre ; rejouer la même requête donne le même résultat.

```json
{ "ordre": [12, 7, 9] }
```

La position 1 reçoit en premier. Réponse 200 : même forme que le `GET`.

| Code | Cas |
|---|---|
| 400 | Identifiant invalide ; liste absente, vide ou contenant autre chose que des entiers ≥ 1 ; doublon ; liste différente des membres de la tontine ; tontine déjà démarrée (« Ordre figé ») |
| 403 | Appelant non gérant, non participant, ou tontine inexistante |

L'écriture se fait dans une transaction `Serializable` : en cas d'échec, aucun ordre n'est à moitié modifié.

## 4.2 Démarrage et calendrier des tours

### `POST /api/tontines/:id/demarrer`

Réservé au gérant. Corps : `{ "date_debut": "2026-11-30" }` (aujourd'hui ou plus tard).

Conditions : tontine `en_preparation`, tous les membres prévus inscrits (`nombre_membres` atteint), ordre de passage défini.

Dans une seule transaction :
1. la tontine passe à `actif` avec sa `date_debut` ;
2. un **tour** est créé par membre : le tour *n* a pour bénéficiaire le membre d'ordre *n* ;
3. une **cotisation** est créée pour chaque membre et chaque tour (bénéficiaire compris), au montant de la tontine, avec le statut `non_paye`.

Dates des tours (calculées depuis la date de début, jamais depuis le tour précédent) :

| Fréquence | Tour *n* |
|---|---|
| `quotidien` | date de début + (*n* − 1) jours |
| `hebdomadaire` | date de début + (*n* − 1) × 7 jours |
| `mensuel` | même jour du mois, (*n* − 1) mois plus tard ; si le mois est trop court, dernier jour du mois (31 janvier, 28 février, 31 mars) |

Cagnotte attendue d'un tour : `nombre de membres × montant de la cotisation`. C'est un montant **attendu**, pas un montant encaissé.

Statuts d'un tour : `a_venir`, `en_cours` (le tour 1 au démarrage), `complete`.

Réponse 201 :

```json
{
  "message": "Tontine démarrée",
  "tontine_id": 4,
  "statut": "actif",
  "date_debut": "2026-11-30",
  "tour_en_cours": 1,
  "tours": [
    {
      "tour_id": 21, "numero": 1, "date_prevue": "2026-11-30", "montant_cagnotte": "15000",
      "statut": "en_cours", "date_remise": null,
      "beneficiaire": { "utilisateur_id": 12, "nom": "Awa", "photo": null }
    }
  ]
}
```

| Code | Cas |
|---|---|
| 400 | Identifiant invalide ; date absente, impossible ou passée ; membres incomplets ; ordre non défini |
| 403 | Appelant non gérant, non participant, ou tontine inexistante |
| 409 | Tontine déjà démarrée ; ou deux démarrages simultanés |

### `GET /api/tontines/:id/tours`

Accessible à tout participant. Réponse 200 : même forme que la réponse du démarrage (sans le champ `message`). Avant le démarrage, `tours` est vide et `tour_en_cours` vaut `null`.

| Code | Cas |
|---|---|
| 400 | Identifiant invalide |
| 403 | Non participant, ou tontine inexistante |

## Limites et décisions en attente

- **Aucun schéma modifié.** Le module écrit des lignes dans `Tour` et `Cotisation` sans changer leur structure. L'accord de l'équipe sur leurs statuts reste à confirmer.
- `Cotisation` n'a pas de contrainte d'unicité (`participation`, `tour`) : les doublons sont évités par le code (démarrage unique) et vérifiés par les tests.
- La route d'ajout de membre (`tontines.js`) utilise une transaction `Serializable` : deux ajouts simultanés peuvent provoquer une erreur 500 côté serveur. Correction à décider avec l'auteure de cette route.

## À venir

- 4.3 : marquer la remise de la cagnotte et faire avancer le tour en cours.