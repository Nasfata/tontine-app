// Ce dépôt contient toutes les requêtes Prisma utilisées par les tontines et participations.
const prisma = require('../config/baseDeDonnees');

// Cette fonction crée la tontine et son gérant dans une transaction atomique.
async function creerTontineAvecGerant(utilisateurId, donnees) {
  return prisma.$transaction(async (transaction) => {
    const tontine = await transaction.tontine.create({
      data: { ...donnees, statut: 'en_preparation' }, select: { id: true },
    });
    await transaction.participation.create({ data: { utilisateurId, tontineId: tontine.id, roleCode: 'gerant' } });
    return tontine;
  });
}

// Cette fonction liste les tontines et les informations de rôle d'un utilisateur.
async function listerTontinesUtilisateur(utilisateurId) {
  return prisma.participation.findMany({
    where: { utilisateurId },
    include: { tontine: { include: { _count: { select: { participations: true } } } }, role: { select: { libelle: true } } },
    orderBy: { tontineId: 'desc' },
  });
}

// Cette fonction lit le rôle d'un compte dans une tontine.
async function trouverRole(utilisateurId, tontineId) {
  const participation = await prisma.participation.findUnique({
    where: { utilisateurId_tontineId: { utilisateurId, tontineId: Number(tontineId) } }, select: { roleCode: true },
  });
  return participation ? participation.roleCode : null;
}

// Cette fonction lit un enregistrement de tontine par son identifiant.
async function trouverTontineParId(id, select) {
  return prisma.tontine.findUnique({ where: { id: Number(id) }, ...(select ? { select } : {}) });
}

// Cette fonction liste les membres dans l'ordre utilisé par le détail.
async function listerMembres(tontineId) {
  return prisma.participation.findMany({
    where: { tontineId },
    select: { roleCode: true, utilisateur: { select: { id: true, nom: true, photo: true } } },
    orderBy: { utilisateur: { nom: 'asc' } },
  });
}

// Cette fonction ajoute un membre et conserve les erreurs métier historiques.
async function ajouterMembre(tontineId, utilisateurIdCible, telephone, utiliserIdentifiant) {
  return prisma.$transaction(async (transaction) => {
    const tontine = await transaction.tontine.findUnique({ where: { id: Number(tontineId) } });
    if (!tontine) return { erreur: 'Tontine introuvable', statut: 404 };
    const nombreInscrits = await transaction.participation.count({ where: { tontineId: tontine.id } });
    if (nombreInscrits >= tontine.nombreMembres) return { erreur: 'La tontine a déjà atteint son nombre maximal de membres', statut: 400 };
    const utilisateur = utiliserIdentifiant
      ? await transaction.utilisateur.findUnique({ where: { id: utilisateurIdCible }, select: { id: true } })
      : await transaction.utilisateur.findUnique({ where: { telephone }, select: { id: true } });
    if (!utilisateur) return utiliserIdentifiant
      ? { erreur: 'Utilisateur introuvable', statut: 404 }
      : { erreur: 'Aucun compte ne correspond à ce numéro', statut: 404, invitation: true };
    const participation = await transaction.participation.findUnique({
      where: { utilisateurId_tontineId: { utilisateurId: utilisateur.id, tontineId: tontine.id } }, select: { id: true },
    });
    if (participation) return { erreur: 'Cette personne est déjà membre de la tontine', statut: 409 };
    await transaction.participation.create({ data: { utilisateurId: utilisateur.id, tontineId: tontine.id, roleCode: 'membre' } });
    return { succes: true };
  });
}

// Cette fonction lit la participation d'un membre pour préparer son retrait.
async function trouverParticipation(utilisateurId, tontineId) {
  return prisma.participation.findUnique({
    where: { utilisateurId_tontineId: { utilisateurId, tontineId } }, select: { id: true },
  });
}

// Cette fonction vérifie si des cotisations ou tours empêchent le retrait.
async function compterActivitesParticipation(participationId) {
  const [nombreCotisations, nombreTours] = await Promise.all([
    prisma.cotisation.count({ where: { participationId } }),
    prisma.tour.count({ where: { beneficiaireId: participationId } }),
  ]);
  return { nombreCotisations, nombreTours };
}

// Cette fonction supprime uniquement la participation ciblée.
async function supprimerParticipation(id) {
  return prisma.participation.delete({ where: { id } });
}

// Les services sont les seuls appelants des opérations Prisma de ce dépôt.
module.exports = { creerTontineAvecGerant, listerTontinesUtilisateur, trouverRole, trouverTontineParId, listerMembres, ajouterMembre, trouverParticipation, compterActivitesParticipation, supprimerParticipation };
