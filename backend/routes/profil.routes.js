// Ce fichier déclare les chemins du profil et configure la réception des photos.
const express = require('express');
const verifierAuthentification = require('../middleware/verifierAuthentification');
const recevoirPhotoProfil = require('../middleware/recevoirPhotoProfil');
const controleurProfil = require('../controleurs/profil.controleur');
const routeur = express.Router();

// Toutes les opérations de profil nécessitent une session valide.
routeur.use(verifierAuthentification);
routeur.get('/', controleurProfil.lireProfil);
routeur.put('/', controleurProfil.modifierProfil);
routeur.post('/photo', recevoirPhotoProfil, controleurProfil.modifierPhoto);

// Les erreurs Multer conservent leur statut et leur message historiques.
routeur.use((erreur, req, res, suivant) => res.status(400).json({ erreur: erreur.message }));

// L'application monte ce routeur sous /api/profil.
module.exports = routeur;
