// Ce fichier déclare les chemins HTTP dédiés aux contacts.
const express = require('express');
const verifierAuthentification = require('../middleware/verifierAuthentification');
const controleurContacts = require('../controleurs/contacts.controleur');
const routeur = express.Router();

// Les suggestions sont réservées aux personnes connectées.
routeur.use(verifierAuthentification);
routeur.post('/correspondance', controleurContacts.rechercherCorrespondances);

// L'application monte ce routeur sous /api/contacts.
module.exports = routeur;
