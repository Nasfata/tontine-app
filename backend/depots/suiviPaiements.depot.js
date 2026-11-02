// Ce dépôt contient les lectures Prisma du suivi des paiements : tontine, tour, membres et cotisations.
const prisma = require('../config/baseDeDonnees');

// Cette fonction lit le statut de la tontine.
async function trouverTontine(tontineId) {
  return prisma.tontine.findUnique({ where: { id: tontineId }, select: { id: true, statut: true } });
}

// Cette fonction cherche un tour par son numéro dans la tontine.
async function trouverTourParNumero(tontineId, numero) {
  return prisma.tour.findFirst({ where: { tontineId, numero }, select: { id: true, numero: true, statut: true, datePrevue: true } });
}

// Cette fonction cherche le tour en cours de la tontine (il n'y en a aucun avant le démarrage ou après la fin).
async function trouverTourEnCours(tontineId) {
  return prisma.tour.findFirst({ where: { tontineId, statut: 'en_cours' }, select: { id: true, numero: true, statut: true, datePrevue: true } });
}

// Cette fonction liste les membres de la tontine avec leur nom.
async function listerMembres(tontineId) {
  return prisma.participation.findMany({
    where: { tontineId },
    select: { utilisateur: { select: { id: true, nom: true } } },
  });
}

// Cette fonction liste les cotisations d'un tour, avec le membre concerné.
async function listerCotisationsDuTour(tourId) {
  return prisma.cotisation.findMany({
    where: { tourId },
    select: {
      id: true, montant: true, dateEcheance: true, datePaiement: true, statut: true, preuveUrl: true, noteRefus: true,
      participation: { select: { utilisateurId: true } },
    },
  });
}

// Cette fonction liste toutes les cotisations de la tontine (tous les tours), pour calculer le bilan de chaque membre.
async function listerCotisationsDeLaTontine(tontineId) {
  return prisma.cotisation.findMany({
    where: { participation: { tontineId } },
    select: { statut: true, dateEcheance: true, participation: { select: { utilisateurId: true } } },
  });
}

module.exports = {
  trouverTontine, trouverTourParNumero, trouverTourEnCours, listerMembres, listerCotisationsDuTour, listerCotisationsDeLaTontine,
};