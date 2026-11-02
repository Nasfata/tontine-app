# Module 5 : administration et transparence

L'application ne transfère jamais d'argent. Ce module est en **lecture seule** : il montre l'état de la tontine à partir des tours et des cotisations déjà enregistrés, sans changer le schéma Prisma.

## 5.1 Tableau de bord

### Route

`GET /api/tontines/:id/tableau-de-bord` : réservée aux participants (gérant ou membre). Tous reçoivent la même réponse, avec seulement des totaux (le détail par personne viendra avec 5.2, réservé au gérant).

### Réponse

```json
{
  "tontine": { "id": 1, "statut": "actif", "frequence": "mensuel", "montant_cotisation": "5000", "nombre_membres": 3 },
  "tour_en_cours": { "numero": 1, "date_prevue": "2031-01-31", "beneficiaire": { "utilisateur_id": 4, "nom": "Awa" } },
  "tour_suivant": { "numero": 2, "beneficiaire": { "utilisateur_id": 7, "nom": "Moussa" } },
  "cotisations_tour_en_cours": { "total": 3, "payees": 1, "en_attente": 1, "non_payees": 1, "refusees": 0, "en_retard": 1 },
  "montants_tour_en_cours": { "attendu": "15000", "valide": "5000" }
}
```

### Règles

- `en_retard` est un compteur à part : il compte des cotisations déjà comprises dans `non_payees` et `refusees` dont l'échéance est passée (date en UTC). Il n'entre pas dans le total.
- `payees + en_attente + non_payees + refusees = total`.
- `montants_tour_en_cours.valide` ne compte que les cotisations validées (`paye`). Une cotisation seulement déclarée n'est pas encore de l'argent confirmé.
- Avant le démarrage : `tour_en_cours` et `tour_suivant` valent `null`, compteurs et montants à zéro.
- Pendant le dernier tour : `tour_suivant` vaut `null`. Une fois la tontine terminée : `tour_en_cours` vaut aussi `null`.
- Lecture simple, sans transaction ni verrou : si un paiement est validé pendant l'appel, les chiffres peuvent être décalés d'une unité jusqu'au prochain appel.

### Erreurs

| Code | Cas |
|------|-----|
| 401 | pas de jeton |
| 400 | identifiant de tontine invalide |
| 403 | non-participant (même réponse pour une tontine inexistante) |

### Fichiers

`routes/tableauDeBord.routes.js`, `controleurs/tableauDeBord.controleur.js`, `services/tableauDeBord.service.js`, `depots/tableauDeBord.depot.js`, `tests/tableauDeBord.test.js` (12 tests).

## 5.2 Suivi des paiements par membre

### Route

`GET /api/tontines/:id/suivi-paiements?tour=<numéro>` : **réservée au gérant** (403 pour un simple membre ou un non-participant). Le paramètre `tour` est facultatif et vaut par défaut le tour en cours.

### Réponse

```json
{
  "tontine_id": 1,
  "statut": "actif",
  "tour": { "numero": 1, "statut": "en_cours", "date_prevue": "2031-01-31" },
  "membres": [
    {
      "utilisateur_id": 7,
      "nom": "Moussa",
      "cotisation": {
        "cotisation_id": 12, "statut": "non_paye", "montant": "5000",
        "date_echeance": "2031-01-31", "date_paiement": null, "note_refus": null,
        "a_une_preuve": false, "en_retard": true
      },
      "bilan": { "payees": 0, "total": 3, "en_retard": 1 }
    }
  ]
}
```

### Règles

- `cotisation` concerne le tour demandé ; `bilan` couvre toutes les cotisations du membre dans la tontine.
- `en_retard` : statut `non_paye` ou `refuse`, échéance passée (date en UTC).
- Le chemin du fichier de preuve n'est jamais exposé, seulement `a_une_preuve`.
- Tri : les membres en retard d'abord, puis par nom.
- Avant le démarrage, ou après la fin de la tontine sans paramètre : `tour` vaut `null` et chaque `cotisation` vaut `null` (le bilan reste calculé). Après la fin, `?tour=N` donne l'historique.

### Erreurs

| Code | Cas |
|------|-----|
| 401 | pas de jeton |
| 400 | identifiant invalide, ou `tour` qui n'est pas un entier positif |
| 403 | simple membre ou non-participant |
| 404 | tour demandé introuvable |

### Fichiers

`routes/suiviPaiements.routes.js`, `controleurs/suiviPaiements.controleur.js`, `services/suiviPaiements.service.js`, `depots/suiviPaiements.depot.js`, `tests/suiviPaiements.test.js` (14 tests).