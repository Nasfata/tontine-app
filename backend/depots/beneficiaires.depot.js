// Ce dépôt contient toutes les requêtes Prisma de l'ordre de passage, du démarrage et du calendrier des tours.
const prisma = require('../config/baseDeDonnees');

// Cette fonction exécute plusieurs opérations ensemble : tout réussit ou tout est annulé.
async function dansTransaction(operation) {
  // Le délai de 15 secondes laisse le temps de créer les tours des grandes tontines.
  return prisma.$transaction(operation, { timeout: 15000 });
}

// Cette fonction verrouille la ligne de la tontine : une seconde transaction attend ici que la première se termine.
async function verrouillerTontine(tontineId, client = prisma) {
  const lignes = await client.$queryRaw`SELECT id, statut FROM Tontine WHERE id = ${tontineId} FOR UPDATE`;
  return lignes[0] ?? null;
}

// Cette fonction lit les informations d'une tontine utiles au démarrage et au calendrier.
async function trouverTontine(tontineId, client = prisma) {
  return client.tontine.findUnique({
    where: { id: tontineId },
    select: { id: true, statut: true, frequence: true, montantCotisation: true, nombreMembres: true, dateDebut: true },
  });
}

// Cette fonction lit les participants avec leur ordre et les informations publiques de leur compte.
async function listerParticipationsAvecComptes(tontineId, client = prisma) {
  return client.participation.findMany({
    where: { tontineId },
    select: { roleCode: true, ordrePassage: true, utilisateur: { select: { id: true, nom: true, photo: true } } },
  });
}

// Cette fonction lit les participants sous leur forme minimale pour contrôler et écrire l'ordre.
async function listerParticipants(tontineId, client = prisma) {
  return client.participation.findMany({ where: { tontineId }, select: { id: true, utilisateurId: true, ordrePassage: true } });
}

// Cette fonction écrit la position d'un membre dans l'ordre de passage.
async function enregistrerPosition(utilisateurId, tontineId, position, client = prisma) {
  return client.participation.update({
    where: { utilisateurId_tontineId: { utilisateurId, tontineId } },
    data: { ordrePassage: position },
  });
}

// Cette fonction passe la tontine à "actif" avec sa date de début.
async function activerTontine(tontineId, dateDebut, client = prisma) {
  return client.tontine.update({ where: { id: tontineId }, data: { statut: 'actif', dateDebut } });
}

// Cette fonction crée un tour et renvoie son identifiant.
async function creerTour(donnees, client = prisma) {
  const tour = await client.tour.create({ data: donnees, select: { id: true } });
  return tour.id;
}

// Cette fonction crée toutes les cotisations d'un tour en une seule requête.
async function creerCotisations(donnees, client = prisma) {
  return client.cotisation.createMany({ data: donnees });
}

// Cette fonction lit les tours d'une tontine avec leur bénéficiaire.
async function listerTours(tontineId, client = prisma) {
  return client.tour.findMany({
    where: { tontineId },
    orderBy: { numero: 'asc' },
    select: {
      id: true, numero: true, datePrevue: true, montantCagnotte: true, statut: true, dateRemise: true,
      beneficiaire: { select: { utilisateur: { select: { id: true, nom: true, photo: true } } } },
    },
  });
}

// Cette fonction lit un tour de la tontine à partir de son numéro (1, 2, 3...).
async function trouverTourParNumero(tontineId, numero, client = prisma) {
  return client.tour.findFirst({ where: { tontineId, numero }, select: { id: true, numero: true, statut: true } });
}

// Cette fonction compte les cotisations d'un tour qui ne sont pas encore validées (non payées, en attente ou refusées).
async function compterCotisationsNonPayees(tourId, client = prisma) {
  return client.cotisation.count({ where: { tourId, statut: { not: 'paye' } } });
}

// Cette fonction termine le tour en cours ; la condition sur le statut est dans l'écriture elle-même.
// Si deux appels arrivent ensemble, un seul trouve encore le tour "en cours" : l'autre modifie 0 ligne.
async function terminerTour(tourId, dateRemise, client = prisma) {
  const resultat = await client.tour.updateMany({ where: { id: tourId, statut: 'en_cours' }, data: { statut: 'complete', dateRemise } });
  return resultat.count;
}

// Cette fonction démarre le tour suivant ; elle renvoie 0 quand il n'y en a plus (le tour terminé était le dernier).
async function demarrerTour(tontineId, numero, client = prisma) {
  const resultat = await client.tour.updateMany({ where: { tontineId, numero, statut: 'a_venir' }, data: { statut: 'en_cours' } });
  return resultat.count;
}

// Cette fonction marque la tontine comme terminée.
async function terminerTontine(tontineId, client = prisma) {
  return client.tontine.update({ where: { id: tontineId }, data: { statut: 'termine' } });
}

// Le service est le seul appelant de ces opérations Prisma.
module.exports = {
  dansTransaction,
  verrouillerTontine,
  trouverTontine,
  listerParticipationsAvecComptes,
  listerParticipants,
  enregistrerPosition,
  activerTontine,
  creerTour,
  creerCotisations,
  listerTours,
  trouverTourParNumero,
  compterCotisationsNonPayees,
  terminerTour,
  demarrerTour,
  terminerTontine,
};