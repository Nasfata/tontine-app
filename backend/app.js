// Ce fichier construit l'application Express et branche ses middlewares et routes.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routesApi = require('./routes');
const routesSysteme = require('./routes/systeme.routes');
const gestionErreurs = require('./middleware/gestionErreurs');
const app = express();

// Les appels mobiles et web sont autorisés et le corps JSON est décodé.
app.use(cors());
app.use(express.json());

// Les ressources téléversées restent consultables à la même adresse.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Les adresses et la réponse de santé restent inchangées.
app.get('/', (req, res) => res.json({ message: 'API Tontine OK' }));
app.use('/test-db', routesSysteme);
app.use('/api', routesApi);

// Les erreurs inattendues non traitées suivent le format JSON habituel.
app.use(gestionErreurs);

// Le serveur et les tests importent cette application sans démarrer de port.
module.exports = app;
