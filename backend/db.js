// Charge le fichier .env : après cette ligne, on peut lire process.env.DB_HOST, etc.
require('dotenv').config();

// Importe mysql2 en version "promise" : elle permet d'écrire await / async,
// c'est beaucoup plus lisible que les anciens "callbacks"
const mysql = require('mysql2/promise');

// Un "pool" = un groupe de connexions MySQL prêtes à servir.
// C'est plus rapide que d'ouvrir/fermer une connexion à chaque requête.
const pool = mysql.createPool({
  host: process.env.DB_HOST,           // adresse du serveur MySQL (localhost = ton PC)
  user: process.env.DB_USER,           // utilisateur MySQL
  password: process.env.DB_PASSWORD,   // mot de passe MySQL
  database: process.env.DB_NAME,       // nom de la base : tontine_db
  waitForConnections: true,            // si toutes les connexions sont occupées, on attend
  connectionLimit: 10,                 // maximum 10 connexions en même temps
});

// On exporte le pool pour pouvoir l'utiliser dans les autres fichiers :
// const db = require('./db');
module.exports = pool;