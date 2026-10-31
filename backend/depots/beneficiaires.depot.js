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

// Le service est le seul appelant de ces opérations Prisma.
module.exports = {
  dansTransaction, verrouillerTontine, trouverTontine, listerParticipationsAvecComptes, listerParticipants,
  enregistrerPosition, activerTontine, creerTour, creerCotisations, listerTours,
};