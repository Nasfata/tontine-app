// Ce fichier déclare uniquement les chemins HTTP de l'ordre de passage et du démarrage, avec leur authentification.
const express = require('express');
const verifierAuthentification = require('../middleware/verifierAuthentification');
const controleurBeneficiaires = require('../controleurs/beneficiaires.controleur');
const routeur = express.Router();

// Toutes ces routes exigent une session valide.
routeur.use(verifierAuthentification);
routeur.get('/:id/ordre', controleurBeneficiaires.lireOrdre);
routeur.put('/:id/ordre', controleurBeneficiaires.definirOrdre);
routeur.post('/:id/demarrer', controleurBeneficiaires.demarrerTontine);
routeur.get('/:id/tours', controleurBeneficiaires.lireCalendrier);
routeur.post('/:id/tours/:numero/remise', controleurBeneficiaires.marquerRemise);

// L'application monte ce routeur sous /api/tontines.
module.exports = routeur;