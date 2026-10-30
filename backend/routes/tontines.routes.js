// Ce fichier déclare uniquement les chemins HTTP des tontines et leur authentification.
const express = require('express');
const verifierAuthentification = require('../middleware/verifierAuthentification');
const controleurTontines = require('../controleurs/tontines.controleur');
const routeur = express.Router();

// Toutes les routes de tontines exigent une session valide.
routeur.use(verifierAuthentification);
routeur.post('/', controleurTontines.creerTontine);
routeur.get('/', controleurTontines.listerTontines);
routeur.post('/:id/membres', controleurTontines.rejoindreTontine);
routeur.get('/:id', controleurTontines.lireTontine);
routeur.delete('/:id/membres/:utilisateurId', controleurTontines.retirerMembre);

// L'application monte ce routeur sous /api/tontines.
module.exports = routeur;
