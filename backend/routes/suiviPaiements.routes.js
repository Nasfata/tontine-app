const express = require('express');
const verifierAuthentification = require('../middleware/verifierAuthentification');
const routeur = express.Router();

// Cette route expose le suivi des paiements d'une tontine, réservé à son gérant.
const controleurSuiviPaiements = require('../controleurs/suiviPaiements.controleur');

routeur.use(verifierAuthentification);

routeur.get('/:id/suivi-paiements', controleurSuiviPaiements.lireSuivi);

module.exports = routeur;