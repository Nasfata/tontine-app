// Ce dépôt contient la lecture Prisma utilisée par la route de diagnostic.
const prisma = require('../config/baseDeDonnees');

// Cette fonction retourne les rôles pour vérifier l'accès à MySQL.
async function listerRoles() {
  return prisma.role.findMany();
}

// Seule cette couche expose les opérations de base de données.
module.exports = { listerRoles };
