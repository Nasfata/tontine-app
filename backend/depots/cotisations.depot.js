// Ce dépôt contient toutes les requêtes Prisma des cotisations : liste, déclaration, preuve et décision du gérant.
const prisma = require('../config/baseDeDonnees');

// Les champs lus en base pour une cotisation, partagés par toutes les lectures.
const selectCotisation = {
  id: true, montant: true, dateEcheance: true, datePaiement: true, statut: true, preuveUrl: true, noteRefus: true,
  tour: { select: { numero: true, beneficiaire: { select: { utilisateur: { select: { id: true, nom: true } } } } } },
  participation: { select: { utilisateur: { select: { id: true, nom: true } } } },
};

// Cette fonction liste les cotisations d'une tontine selon les filtres demandés.
async function listerCotisations({ tontineId, utilisateurId, statut, enRetard, statutsAPayer, aujourdhui }) {
  // Une cotisation est en retard si elle reste à payer et que son échéance est avant aujourd'hui.
  const conditionRetard = { statut: { in: statutsAPayer }, dateEcheance: { lt: aujourdhui } };
  // Toutes les conditions doivent être vraies (AND).
  const conditions = [{ participation: { tontineId, ...(utilisateurId ? { utilisateurId } : {}) } }];
  if (statut) conditions.push({ statut });
  if (enRetard === true) conditions.push(conditionRetard);
  // NOT : le contraire de la condition de retard.
  if (enRetard === false) conditions.push({ NOT: conditionRetard });
  return prisma.cotisation.findMany({
    where: { AND: conditions },
    // Tri par échéance, puis par nom du membre, puis par identifiant pour un ordre stable.
    orderBy: [{ dateEcheance: 'asc' }, { participation: { utilisateur: { nom: 'asc' } } }, { id: 'asc' }],
    select: selectCotisation,
  });
}

// Cette fonction relit une cotisation avec les champs publics.
async function lireCotisation(cotisationId) {
  return prisma.cotisation.findUnique({ where: { id: cotisationId }, select: selectCotisation });
}

// Cette fonction cherche la cotisation DU MEMBRE dans CETTE tontine, avec le statut de la tontine.
async function trouverCotisationDuMembre(cotisationId, tontineId, utilisateurId) {
  return prisma.cotisation.findFirst({
    where: { id: cotisationId, participation: { tontineId, utilisateurId } },
    select: { id: true, statut: true, preuveUrl: true, tour: { select: { tontine: { select: { statut: true } } } } },
  });
}

// Cette fonction cherche une cotisation de la tontine, quel que soit le membre, avec le statut de la tontine.
async function trouverCotisationDeLaTontine(cotisationId, tontineId) {
  return prisma.cotisation.findFirst({
    where: { id: cotisationId, participation: { tontineId } },
    select: { id: true, statut: true, tour: { select: { tontine: { select: { statut: true } } } } },
  });
}

// Cette fonction lit le nom du fichier de preuve ; utilisateurId vaut null quand c'est le gérant qui demande.
async function trouverPreuve(cotisationId, tontineId, utilisateurId) {
  return prisma.cotisation.findFirst({
    where: { id: cotisationId, participation: { tontineId, ...(utilisateurId ? { utilisateurId } : {}) } },
    select: { preuveUrl: true },
  });
}

// Cette fonction passe la cotisation en attente ; la condition sur le statut est dans l'écriture elle-même.
// Si deux clics arrivent ensemble, un seul trouve encore la cotisation "à payer" : l'autre modifie 0 ligne.
async function declarerCotisation(cotisationId, statutsAPayer, { datePaiement, preuveUrl }) {
  const resultat = await prisma.cotisation.updateMany({
    where: { id: cotisationId, statut: { in: statutsAPayer } },
    // Une nouvelle déclaration remplace la précédente : ancien motif de refus et ancienne décision disparaissent.
    data: { statut: 'en_attente', datePaiement, noteRefus: null, valideePar: null, preuveUrl },
  });
  return resultat.count;
}

// Cette fonction valide une cotisation en attente ; elle renvoie le nombre de lignes modifiées (0 ou 1).
async function validerCotisation(cotisationId, participationGerantId) {
  const resultat = await prisma.cotisation.updateMany({
    where: { id: cotisationId, statut: 'en_attente' },
    data: { statut: 'paye', valideePar: participationGerantId },
  });
  return resultat.count;
}

// Cette fonction refuse une cotisation en attente : motif conservé, date de paiement effacée, preuve gardée.
async function refuserCotisation(cotisationId, participationGerantId, motif) {
  const resultat = await prisma.cotisation.updateMany({
    where: { id: cotisationId, statut: 'en_attente' },
    data: { statut: 'refuse', noteRefus: motif, datePaiement: null, valideePar: participationGerantId },
  });
  return resultat.count;
}

// Le service est le seul appelant de ces opérations Prisma.
module.exports = {
  listerCotisations, lireCotisation, trouverCotisationDuMembre, trouverCotisationDeLaTontine,
  trouverPreuve, declarerCotisation, validerCotisation, refuserCotisation,
};