// Ce service prépare le suivi des paiements : une ligne par membre avec sa cotisation du tour et son bilan.
const depot = require('../depots/suiviPaiements.depot');
const depotTontines = require('../depots/tontines.depot');
const { lireIdentifiant, debutDeJournee } = require('../utils/validation');
const { DonneesInvalides, Interdit, NonTrouve } = require('../erreurs/erreursMetier');

// Une cotisation est "à payer" tant qu'elle n'est ni déclarée ni validée.
const STATUTS_A_PAYER = ['non_paye', 'refuse'];

// Cette fonction transforme l'identifiant de l'adresse en nombre, ou refuse la requête.
function exigerIdentifiant(brut) {
  const identifiant = lireIdentifiant(brut);
  if (!identifiant) throw new DonneesInvalides('Identifiant invalide');
  return identifiant;
}

// Cette fonction refuse tout le monde sauf le gérant : simples membres et non-participants reçoivent 403.
async function exigerGerant(utilisateurId, tontineId) {
  const roleCode = await depotTontines.trouverRole(utilisateurId, tontineId);
  if (roleCode !== 'gerant') throw new Interdit('Réservé au gérant de la tontine');
}

// Cette fonction met une date au format AAAA-MM-JJ, ou renvoie null s'il n'y a pas de date.
function enTexte(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

// Cette fonction renvoie le suivi des paiements ; numeroBrut est le tour demandé (facultatif, tour en cours par défaut).
async function lireSuivi(utilisateurId, tontineIdBrut, numeroBrut) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  await exigerGerant(utilisateurId, tontineId);

  // Le paramètre "tour" est facultatif, mais s'il est présent il doit être un entier positif.
  let numero = null;
  if (numeroBrut !== undefined) {
    numero = lireIdentifiant(numeroBrut);
    if (!numero) throw new DonneesInvalides('Numéro de tour invalide');
  }

  const tontine = await depot.trouverTontine(tontineId);
  if (!tontine) throw new NonTrouve('Tontine introuvable');

  let tour;
  if (numero) {
    tour = await depot.trouverTourParNumero(tontineId, numero);
    if (!tour) throw new NonTrouve('Tour introuvable');
  } else {
    tour = await depot.trouverTourEnCours(tontineId);
  }

  const [membres, cotisationsTontine, cotisationsTour] = await Promise.all([
    depot.listerMembres(tontineId),
    depot.listerCotisationsDeLaTontine(tontineId),
    tour ? depot.listerCotisationsDuTour(tour.id) : [],
  ]);

  const aujourdhui = debutDeJournee();
  // Une cotisation est en retard si elle reste à payer et que son échéance est avant aujourd'hui.
  const estEnRetard = (cotisation) => STATUTS_A_PAYER.includes(cotisation.statut) && cotisation.dateEcheance < aujourdhui;

  // Bilan de chaque membre sur toute la tontine, rangé par identifiant d'utilisateur.
  const bilans = new Map();
  for (const cotisation of cotisationsTontine) {
    const id = cotisation.participation.utilisateurId;
    const bilan = bilans.get(id) || { payees: 0, total: 0, en_retard: 0 };
    bilan.total += 1;
    if (cotisation.statut === 'paye') bilan.payees += 1;
    if (estEnRetard(cotisation)) bilan.en_retard += 1;
    bilans.set(id, bilan);
  }

  // Cotisation du tour demandé pour chaque membre, rangée par identifiant d'utilisateur.
  const cotisationsParMembre = new Map();
  for (const cotisation of cotisationsTour) {
    cotisationsParMembre.set(cotisation.participation.utilisateurId, {
      cotisation_id: cotisation.id, statut: cotisation.statut, montant: cotisation.montant,
      date_echeance: enTexte(cotisation.dateEcheance), date_paiement: enTexte(cotisation.datePaiement),
      note_refus: cotisation.noteRefus,
      // On n'expose jamais le chemin du fichier : seulement l'information qu'il existe.
      a_une_preuve: Boolean(cotisation.preuveUrl),
      en_retard: estEnRetard(cotisation),
    });
  }

  const lignes = membres.map(({ utilisateur }) => ({
    utilisateur_id: utilisateur.id,
    nom: utilisateur.nom,
    cotisation: cotisationsParMembre.get(utilisateur.id) || null,
    bilan: bilans.get(utilisateur.id) || { payees: 0, total: 0, en_retard: 0 },
  }));

  // Les membres en retard d'abord, puis par nom.
  lignes.sort((a, b) => {
    const retardA = a.cotisation?.en_retard ? 0 : 1;
    const retardB = b.cotisation?.en_retard ? 0 : 1;
    if (retardA !== retardB) return retardA - retardB;
    return a.nom.localeCompare(b.nom);
  });

  return {
    tontine_id: tontine.id,
    statut: tontine.statut,
    tour: tour ? { numero: tour.numero, statut: tour.statut, date_prevue: enTexte(tour.datePrevue) } : null,
    membres: lignes,
  };
}

module.exports = { lireSuivi };