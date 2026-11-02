// Ce fichier déclare uniquement les chemins HTTP des cotisations, avec leur authentification et la réception de la preuve.
const express = require('express');
const verifierAuthentification = require('../middleware/verifierAuthentification');
const recevoirPreuve = require('../middleware/recevoirPreuve');
const controleurCotisations = require('../controleurs/cotisations.controleur');
const routeur = express.Router();

// Toutes ces routes exigent une session valide, puis la participation à la tontine.
routeur.use(verifierAuthentification);
routeur.get('/:id/cotisations', controleurCotisations.exigerParticipant, controleurCotisations.listerCotisations);
routeur.post('/:id/cotisations/:cotisationId/declaration', controleurCotisations.exigerParticipant, recevoirPreuve, controleurCotisations.declarerPaiement);
routeur.get('/:id/cotisations/:cotisationId/preuve', controleurCotisations.exigerParticipant, controleurCotisations.lirePreuve);
routeur.post('/:id/cotisations/:cotisationId/validation', controleurCotisations.exigerParticipant, controleurCotisations.validerPaiement);

// L'application monte ce routeur sous /api/tontines.
module.exports = routeur;