// Charge les paramètres de connexion depuis le fichier .env.
require('dotenv').config();
// Importe le client Prisma partagé avec le reste du backend.
const db = require('../db');

// Ces rôles sont les valeurs de référence prévues dans le schéma SQL.
const roles = [
  { code: 'gerant', libelle: 'Gérant', niveau: 3 },
  { code: 'tresorier', libelle: 'Trésorier', niveau: 2 },
  { code: 'membre', libelle: 'Membre', niveau: 1 },
];

// Crée les rôles absents ou met à jour leur libellé et leur niveau.
async function initialiserRoles() {
  try {
    for (const role of roles) {
      await db.role.upsert({
        where: { code: role.code },
        create: role,
        update: { libelle: role.libelle, niveau: role.niveau },
      });
    }
    console.log('Les rôles de référence sont prêts.');
  } catch (erreur) {
    console.error('Erreur initialisation des rôles :', erreur.message);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

// Lance la préparation des rôles sans supprimer les données existantes.
initialiserRoles();

//cmd pour executer le seeder node prisma/seed.js
