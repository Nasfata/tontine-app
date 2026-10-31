// Ce fichier rassemble les routeurs de l'API sous le préfixe /api.
const express = require('express');
const routeur = express.Router();

// Chaque module possède un routeur indépendant.
routeur.use('/auth', require('./auth.routes'));
routeur.use('/profil', require('./profil.routes'));
routeur.use('/contacts', require('./contacts.routes'));
routeur.use('/tontines', require('./tontines.routes'));
routeur.use('/tontines', require('./beneficiaires.routes'));
routeur.use('/tontines', require('./cotisations.routes'));

// L'application monte ce routeur sous /api.
module.exports = routeur;
