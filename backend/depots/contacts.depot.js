// Ce dépôt exécute les lectures Prisma nécessaires aux suggestions de contacts.
const prisma = require('../config/baseDeDonnees');

// Cette fonction lit le rôle d'un utilisateur dans une tontine.
async function trouverRoleParticipation(utilisateurId, tontineId) {
  const participation = await prisma.participation.findUnique({
    where: { utilisateurId_tontineId: { utilisateurId, tontineId: Number(tontineId) } },
    select: { roleCode: true },
  });
  return participation ? participation.roleCode : null;
}

// Cette fonction liste les comptes qui ne sont pas déjà membres de la tontine.
async function listerUtilisateursEligibles(utilisateurId, tontineId) {
  return prisma.utilisateur.findMany({
    where: { id: { not: utilisateurId }, participations: { none: { tontineId: Number(tontineId) } } },
    select: { id: true, nom: true, photo: true, telephone: true },
  });
}

// Le service contacts utilise ces lectures sans importer Prisma.
module.exports = { trouverRoleParticipation, listerUtilisateursEligibles };
