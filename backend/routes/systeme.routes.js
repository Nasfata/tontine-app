// Ce fichier regroupe les routes simples de diagnostic de l'application.
const express = require('express');
const controleurDiagnostic = require('../controleurs/diagnostic.controleur');
const routeur = express.Router();

// Cette route conserve le contrôle de connexion à MySQL.
routeur.get('/', controleurDiagnostic.lireRoles);

// Le routeur système est monté à la racine de l'application.
module.exports = routeur;
