// Ce service calcule le tableau de bord d'une tontine : tour en cours, bénéficiaires, cotisations et montants.
const depot = require('../depots/tableauDeBord.depot');
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

// Cette fonction refuse les personnes qui ne participent pas à la tontine.
async function exigerParticipant(utilisateurId, tontineId) {
  const roleCode = await depotTontines.trouverRole(utilisateurId, tontineId);
  if (!roleCode) throw new Interdit('Vous ne participez pas à cette tontine');
}

// Cette fonction met en forme le bénéficiaire d'un tour.
function formaterBeneficiaire(tour) {
  const beneficiaire = tour.beneficiaire;
  return beneficiaire ? { utilisateur_id: beneficiaire.utilisateur.id, nom: beneficiaire.utilisateur.nom } : null;
}

// Cette fonction renvoie le tableau de bord à tout participant : mêmes chiffres pour le gérant et les membres.
async function lireTableauDeBord(utilisateurId, tontineIdBrut) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  await exigerParticipant(utilisateurId, tontineId);

  const tontine = await depot.trouverTontine(tontineId);
  if (!tontine) throw new NonTrouve('Tontine introuvable');

  // Les tours sont triés par numéro : le premier "a_venir" est donc le tour suivant.
  const tours = await depot.listerToursEnCoursEtAVenir(tontineId);
  const tourEnCours = tours.find((tour) => tour.statut === 'en_cours') || null;
  const tourSuivant = tourEnCours ? tours.find((tour) => tour.statut === 'a_venir') || null : null;

  // Avant le démarrage ou après la fin, il n'y a pas de tour en cours : tout reste à zéro.
  let cotisations = { total: 0, payees: 0, en_attente: 0, non_payees: 0, refusees: 0, en_retard: 0 };
  let montants = { attendu: '0', valide: '0' };

  if (tourEnCours) {
    const [groupes, enRetard, attendu, valide] = await Promise.all([
      depot.compterCotisationsParStatut(tourEnCours.id),
      depot.compterCotisationsEnRetard(tourEnCours.id, STATUTS_A_PAYER, debutDeJournee()),
      depot.sommeMontants(tourEnCours.id),
      depot.sommeMontants(tourEnCours.id, 'paye'),
    ]);
    // Cette fonction donne le nombre de cotisations d'un statut, ou 0 si aucun groupe ne correspond.
    const nombre = (statut) => groupes.find((groupe) => groupe.statut === statut)?._count._all ?? 0;
    cotisations = {
      total: groupes.reduce((somme, groupe) => somme + groupe._count._all, 0),
      payees: nombre('paye'),
      en_attente: nombre('en_attente'),
      non_payees: nombre('non_paye'),
      refusees: nombre('refuse'),
      en_retard: enRetard,
    };
    montants = { attendu: String(attendu ?? 0), valide: String(valide ?? 0) };
  }

  return {
    tontine: {
      id: tontine.id, statut: tontine.statut, frequence: tontine.frequence,
      montant_cotisation: tontine.montantCotisation, nombre_membres: tontine.nombreMembres,
    },
    tour_en_cours: tourEnCours
      ? { numero: tourEnCours.numero, date_prevue: tourEnCours.datePrevue.toISOString().slice(0, 10), beneficiaire: formaterBeneficiaire(tourEnCours) }
      : null,
    tour_suivant: tourSuivant ? { numero: tourSuivant.numero, beneficiaire: formaterBeneficiaire(tourSuivant) } : null,
    cotisations_tour_en_cours: cotisations,
    montants_tour_en_cours: montants,
  };
}

module.exports = { lireTableauDeBord };