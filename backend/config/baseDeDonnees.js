// Ce fichier prépare et partage le client Prisma utilisé par les dépôts.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Une URL compatible est construite depuis les variables MySQL si elle manque.
if (!process.env.DATABASE_URL) {
  const encoder = (valeur) => encodeURIComponent(valeur || '');
  const hote = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const utilisateur = encoder(process.env.DB_USER);
  const motDePasse = encoder(process.env.DB_PASSWORD);
  const base = encoder(process.env.DB_NAME || 'tontine_db');
  process.env.DATABASE_URL = `mysql://${utilisateur}:${motDePasse}@${hote}:${port}/${base}`;
}

// Le même client est réutilisé dans toute l'application.
module.exports = new PrismaClient();
