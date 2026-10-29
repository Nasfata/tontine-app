// Le client Prisma partagé sert à vérifier l'appartenance à une tontine.
const db = require('../db');

// Cette fonction renvoie le rôle de la personne ou null si elle n'est pas membre.
async function verifierRole(utilisateurId, tontineId) {
  // Prisma sélectionne le rôle de cette personne dans cette tontine.
  const participation = await db.participation.findUnique({
    where: { utilisateurId_tontineId: { utilisateurId, tontineId: Number(tontineId) } },
    select: { roleCode: true },
  });
  // Une participation absente signifie que la personne n'a aucun rôle ici.
  return participation ? participation.roleCode : null;
}

// La fonction peut être réutilisée par les autres routes du backend.
module.exports = { verifierRole };
