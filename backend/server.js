// Charge les variables du fichier .env
require('dotenv').config();

// Express = le framework qui crée le serveur web
const express = require('express');

// CORS = sans lui, le navigateur bloque les appels depuis la version web d'Expo
const cors = require('cors');

// Notre connexion MySQL (fichier db.js)
const db = require('./db');

// Crée l'application Express : c'est notre serveur
const app = express();

// Autorise les appels venant d'autres adresses (Expo web, téléphone...)
app.use(cors());

// Permet à Express de comprendre le JSON envoyé par l'app
// (sans cette ligne, req.body serait vide)
app.use(express.json());

// Importe notre fichier de routes d'authentification
const routesAuth = require('./routes/auth');

// Branche ces routes sous le préfixe /api/auth :
// "/inscription" dans auth.js devient donc "/api/auth/inscription"
app.use('/api/auth', routesAuth);

// Importe les routes du profil
const routesProfil = require('./routes/profil');

// Branche-les sous /api/profil
app.use('/api/profil', routesProfil);

// Importe les routes sécurisées de tontines.
const routesTontines = require('./routes/tontines');

// Branche les routes sous /api/tontines.
app.use('/api/tontines', routesTontines);

// Importe les routes de correspondance de contacts.
const routesContacts = require('./routes/contacts');

// Branche les correspondances sous /api/contacts.
app.use('/api/contacts', routesContacts);

// Rend le dossier "uploads" accessible par URL :
// une photo sera visible sur http://localhost:3000/uploads/nom-du-fichier.jpg
// path est un outil Node pour construire un chemin de fichier
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Route de test n°1 ----------
// Quand quelqu'un ouvre http://localhost:3000/ on répond avec un petit message
// req = la requête reçue, res = la réponse que l'on renvoie
app.get('/', (req, res) => {
  res.json({ message: 'API Tontine OK' });
});

// ---------- Route de test n°2 : teste la base de données ----------
// async = cette fonction va attendre MySQL (avec await)
app.get('/test-db', async (req, res) => {
  try {
    // Envoie une requête SQL à MySQL et attend la réponse.
    // [rows] = on récupère le premier élément du résultat (les lignes de la table)
    const [rows] = await db.query('SELECT * FROM Role');

    // Renvoie les lignes au navigateur, au format JSON
    res.json(rows);
  } catch (err) {
    // Si MySQL a un problème, on affiche l'erreur dans le terminal pour t'aider
    console.error('Erreur MySQL :', err.message);

    // 500 = erreur serveur. On renvoie aussi le message pour que tu voies le souci
    res.status(500).json({ erreur: err.message });
  }
});

// Lit le port dans le .env, ou utilise 3000 s'il n'y est pas
const PORT = process.env.PORT || 3000;

// Démarre le serveur et le fait "écouter" sur le port
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
