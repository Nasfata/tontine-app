// Charge les variables de connexion placées dans le fichier .env.
require('dotenv').config();

// Importe le client généré par Prisma à partir de prisma/schema.prisma.
const { PrismaClient } = require('@prisma/client');

// Construit une URL MySQL à partir des variables déjà utilisées par le projet.
if (!process.env.DATABASE_URL) {
  const encoder = (valeur) => encodeURIComponent(valeur || '');
  const hote = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const utilisateur = encoder(process.env.DB_USER);
  const motDePasse = encoder(process.env.DB_PASSWORD);
  const base = encoder(process.env.DB_NAME || 'tontine_db');
  process.env.DATABASE_URL = `mysql://${utilisateur}:${motDePasse}@${hote}:${port}/${base}`;
}

// Une instance partagée évite d'ouvrir un nouveau pool pour chaque route.
const prisma = new PrismaClient();

// Exporte le client afin que les routes puissent utiliser ses modèles.
module.exports = prisma;
