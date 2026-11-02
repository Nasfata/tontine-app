// Ce dépôt contient les lectures Prisma du tableau de bord : tontine, tours et décompte des cotisations.
const prisma = require('../config/baseDeDonnees');

// Cette fonction lit les informations générales de la tontine.
async function trouverTontine(tontineId) {
  return prisma.tontine.findUnique({
    where: { id: tontineId },
    select: { id: true, statut: true, frequence: true, montantCotisation: true, nombreMembres: true },
  });
}

// Cette fonction liste le tour en cours et les tours à venir, avec leur bénéficiaire, dans l'ordre des numéros.
async function listerToursEnCoursEtAVenir(tontineId) {
  return prisma.tour.findMany({
    where: { tontineId, statut: { in: ['en_cours', 'a_venir'] } },
    orderBy: { numero: 'asc' },
    select: {
      id: true, numero: true, statut: true, datePrevue: true,
      beneficiaire: { select: { utilisateur: { select: { id: true, nom: true } } } },
    },
  });
}

// Cette fonction compte les cotisations d'un tour, groupées par statut : [{ statut, _count: { _all } }].
async function compterCotisationsParStatut(tourId) {
  return prisma.cotisation.groupBy({ by: ['statut'], where: { tourId }, _count: { _all: true } });
}

// Cette fonction compte les cotisations encore à payer dont l'échéance est avant aujourd'hui.
async function compterCotisationsEnRetard(tourId, statutsAPayer, aujourdhui) {
  return prisma.cotisation.count({
    where: { tourId, statut: { in: statutsAPayer }, dateEcheance: { lt: aujourdhui } },
  });
}

// Cette fonction additionne les montants d'un tour ; avec un statut, elle n'additionne que ce statut.
async function sommeMontants(tourId, statut) {
  const resultat = await prisma.cotisation.aggregate({
    where: { tourId, ...(statut ? { statut } : {}) },
    _sum: { montant: true },
  });
  return resultat._sum.montant;
}

module.exports = {
  trouverTontine, listerToursEnCoursEtAVenir, compterCotisationsParStatut, compterCotisationsEnRetard, sommeMontants,
};