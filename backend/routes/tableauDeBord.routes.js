const express = require('express');
const verifierAuthentification = require('../middleware/verifierAuthentification');
const routeur = express.Router();

// Cette route expose le tableau de bord d'une tontine, réservé aux participants connectés.
const controleurTableauDeBord = require('../controleurs/tableauDeBord.controleur');

routeur.use(verifierAuthentification);

routeur.get('/:id/tableau-de-bord', controleurTableauDeBord.lireTableauDeBord);

module.exports = routeur;