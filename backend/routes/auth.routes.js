// Ce fichier déclare les chemins HTTP publics de l'authentification.
const express = require('express');
const controleurAuth = require('../controleurs/auth.controleur');
const routeur = express.Router();

// Les deux chemins et leurs méthodes restent identiques.
routeur.post('/inscription', controleurAuth.inscrire);
routeur.post('/connexion', controleurAuth.connecter);

// L'application monte ce routeur sous /api/auth.
module.exports = routeur;
