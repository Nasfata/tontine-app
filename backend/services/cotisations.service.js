// Ce service applique les règles des cotisations : consultation, déclaration de paiement, preuve et décision du gérant.
const path = require('node:path');
const depot = require('../depots/cotisations.depot');
const depotTontines = require('../depots/tontines.depot');
const { lireIdentifiant, debutDeJournee } = require('../utils/validation');
const { detecterType, enregistrerPreuve, lirePreuve: lireFichierPreuve, supprimerPreuve } = require('../utils/stockagePreuves');
const { DonneesInvalides, Interdit, NonTrouve, Conflit } = require('../erreurs/erreursMetier');

// Les statuts stockés d'une cotisation. Le retard n'en fait pas partie : il se calcule.
const statutsCotisation = ['non_paye', 'en_attente', 'paye', 'refuse'];
// Seules ces cotisations restent à payer : elles peuvent être "en retard" et être déclarées.
const statutsAPayer = ['non_paye', 'refuse'];
// Type de contenu à annoncer au client, selon l'extension du fichier enregistré.
const typesContenu = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// Cette fonction transforme l'identifiant de l'adresse en nombre, ou refuse la requête.
function exigerIdentifiant(brut) {
  const identifiant = lireIdentifiant(brut);
  if (!identifiant) throw new DonneesInvalides('Identifiant invalide');
  return identifiant;
}

// Cette fonction met en forme une cotisation (noms en snake_case, comme le reste de l'API).
function formaterCotisation(cotisation, aujourdhui) {
  // "slice(0, 10)" garde seulement AAAA-MM-JJ d'une date complète.
  const enTexte = (date) => (date ? date.toISOString().slice(0, 10) : null);
  return {
    cotisation_id: cotisation.id,
    tour_numero: cotisation.tour.numero,
    beneficiaire: cotisation.tour.beneficiaire
      ? { utilisateur_id: cotisation.tour.beneficiaire.utilisateur.id, nom: cotisation.tour.beneficiaire.utilisateur.nom }
      : null,
    membre: { utilisateur_id: cotisation.participation.utilisateur.id, nom: cotisation.participation.utilisateur.nom },
    montant: cotisation.montant,
    date_echeance: enTexte(cotisation.dateEcheance),
    date_paiement: enTexte(cotisation.datePaiement),
    statut: cotisation.statut,
    // Le retard est calculé à chaque lecture : il n'est jamais stocké, donc jamais périmé.
    en_retard: statutsAPayer.includes(cotisation.statut) && cotisation.dateEcheance < aujourdhui,
    // On dit seulement si une preuve existe : le nom du fichier n'est jamais exposé.
    preuve_disponible: Boolean(cotisation.preuveUrl),
    note_refus: cotisation.noteRefus,
  };
}

// Cette fonction vérifie l'identifiant de la tontine et que l'appelant y participe.
async function controlerAcces(utilisateurId, tontineIdBrut) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  const roleCode = await depotTontines.trouverRole(utilisateurId, tontineId);
  if (!roleCode) throw new Interdit('Vous ne participez pas à cette tontine');
  return { tontineId, roleCode };
}

// Cette fonction liste les cotisations ; un simple membre ne voit que les siennes.
async function listerCotisations(utilisateurId, { tontineId, roleCode }, filtres) {
  // Filtre sur un membre précis, s'il est demandé.
  let utilisateurCible = null;
  if (filtres.utilisateur_id !== undefined) {
    utilisateurCible = lireIdentifiant(filtres.utilisateur_id);
    if (!utilisateurCible) throw new DonneesInvalides('Identifiant invalide');
  }
  // Un simple membre ne voit que ses propres cotisations, quoi qu'il demande.
  if (roleCode !== 'gerant') {
    if (utilisateurCible && utilisateurCible !== utilisateurId) throw new Interdit('Vous ne pouvez consulter que vos propres cotisations');
    utilisateurCible = utilisateurId;
  }
  // Filtre sur le statut stocké.
  const statut = filtres.statut;
  if (statut !== undefined && !statutsCotisation.includes(statut)) throw new DonneesInvalides('Statut invalide');
  // Filtre sur le retard : "true", "false" ou absent.
  const retard = filtres.en_retard;
  if (retard !== undefined && retard !== 'true' && retard !== 'false') throw new DonneesInvalides('Le paramètre en_retard doit valoir true ou false');

  const aujourdhui = debutDeJournee();
  const cotisations = await depot.listerCotisations({
    tontineId, utilisateurId: utilisateurCible, statut,
    enRetard: retard === undefined ? null : retard === 'true',
    statutsAPayer, aujourdhui,
  });
  return { tontine_id: tontineId, cotisations: cotisations.map((cotisation) => formaterCotisation(cotisation, aujourdhui)) };
}

// Cette fonction enregistre la déclaration "J'ai payé" d'un membre, avec ou sans photo de preuve.
async function declarerPaiement(utilisateurId, { tontineId }, cotisationIdBrut, fichier) {
  // Nom du fichier enregistré par CETTE requête : il faut le supprimer si la suite échoue.
  let nomNouvellePreuve = null;
  try {
    const cotisationId = exigerIdentifiant(cotisationIdBrut);
    // On vérifie le vrai type du fichier AVANT d'écrire quoi que ce soit sur le disque.
    let typePreuve = null;
    if (fichier) {
      typePreuve = detecterType(fichier.buffer);
      if (!typePreuve) throw new DonneesInvalides('La preuve doit être une image JPEG, PNG ou WebP');
    }
    // On cherche la cotisation DE L'APPELANT dans CETTE tontine : inexistante, d'un autre membre ou d'une autre tontine, la réponse est la même.
    const cotisation = await depot.trouverCotisationDuMembre(cotisationId, tontineId, utilisateurId);
    if (!cotisation) throw new NonTrouve('Cotisation introuvable');
    if (cotisation.tour.tontine.statut !== 'actif') throw new Conflit('La tontine n’est pas active');
    if (!statutsAPayer.includes(cotisation.statut)) throw new Conflit('Cette cotisation est déjà déclarée ou validée');

    // Tout est valide : on peut écrire le fichier.
    if (typePreuve) nomNouvellePreuve = await enregistrerPreuve(cotisation.id, fichier.buffer, typePreuve.extension);
    const modifiees = await depot.declarerCotisation(cotisation.id, statutsAPayer, { datePaiement: debutDeJournee(), preuveUrl: nomNouvellePreuve });
    // Si on a perdu la course, l'erreur ci-dessous déclenche la suppression de notre fichier.
    if (modifiees === 0) throw new Conflit('Cette cotisation est déjà déclarée ou validée');

    // La déclaration est enregistrée : le nouveau fichier appartient désormais à la base, on ne doit plus le supprimer.
    nomNouvellePreuve = null;
    // L'ancienne preuve (cas d'un refus précédent) peut partir.
    await supprimerPreuve(cotisation.preuveUrl);
    return formaterCotisation(await depot.lireCotisation(cotisation.id), debutDeJournee());
  } catch (erreur) {
    // En cas d'échec après l'écriture du fichier, on ne laisse pas de fichier orphelin.
    await supprimerPreuve(nomNouvellePreuve);
    throw erreur;
  }
}

// Cette fonction renvoie le contenu de la preuve au propriétaire de la cotisation ou au gérant.
async function lirePreuve(utilisateurId, { tontineId, roleCode }, cotisationIdBrut) {
  const cotisationId = exigerIdentifiant(cotisationIdBrut);
  // Le gérant voit toutes les preuves de sa tontine ; un membre, uniquement la sienne.
  const cotisation = await depot.trouverPreuve(cotisationId, tontineId, roleCode === 'gerant' ? null : utilisateurId);
  // Cotisation inexistante, d'un autre membre, ou sans preuve : une seule réponse, on ne révèle rien.
  if (!cotisation || !cotisation.preuveUrl) throw new NonTrouve('Preuve introuvable');
  let octets;
  try {
    octets = await lireFichierPreuve(cotisation.preuveUrl);
  } catch (erreur) {
    // La base connaît la preuve mais le fichier a disparu du disque : on le dit clairement.
    if (erreur.code === 'ENOENT') throw new NonTrouve('Le fichier de la preuve n’est plus disponible');
    throw erreur;
  }
  return { octets, typeContenu: typesContenu[path.extname(cotisation.preuveUrl).toLowerCase()] || 'application/octet-stream' };
}

// Cette fonction permet au gérant de valider ou refuser une déclaration de paiement.
async function decider(utilisateurId, { tontineId, roleCode }, cotisationIdBrut, corps) {
  if (roleCode !== 'gerant') throw new Interdit('Réservé au gérant de la tontine');
  const cotisationId = exigerIdentifiant(cotisationIdBrut);
  // "?? {}" évite une erreur si la requête n'a pas de corps.
  const { decision, note } = corps ?? {};
  if (decision !== 'valider' && decision !== 'refuser') throw new DonneesInvalides('La décision doit être « valider » ou « refuser »');
  // Le motif est facultatif, réservé au refus, textuel, et limité à 500 caractères.
  let motif = null;
  if (note !== undefined && note !== null) {
    if (decision === 'valider' || typeof note !== 'string' || note.trim().length > 500) throw new DonneesInvalides('Motif invalide');
    // Un motif vide ou fait d'espaces est traité comme "pas de motif".
    motif = note.trim() || null;
  }

  // La cotisation doit appartenir à CETTE tontine (peu importe quel membre la détient).
  const cotisation = await depot.trouverCotisationDeLaTontine(cotisationId, tontineId);
  if (!cotisation) throw new NonTrouve('Cotisation introuvable');
  if (cotisation.tour.tontine.statut !== 'actif') throw new Conflit('La tontine n’est pas active');
  if (cotisation.statut !== 'en_attente') throw new Conflit('Cette cotisation n’est pas en attente de validation');

  // valideePar référence la PARTICIPATION du gérant (pas son compte).
  const participationGerant = await depotTontines.trouverParticipation(utilisateurId, tontineId);
  // Si deux décisions arrivent en même temps, une seule trouve encore la cotisation "en attente".
  const modifiees = decision === 'valider'
    ? await depot.validerCotisation(cotisation.id, participationGerant.id)
    : await depot.refuserCotisation(cotisation.id, participationGerant.id, motif);
  if (modifiees === 0) throw new Conflit('Cette cotisation n’est pas en attente de validation');
  return formaterCotisation(await depot.lireCotisation(cotisation.id), debutDeJournee());
}

// Le contrôleur appelle ces opérations sans connaître Prisma.
module.exports = { controlerAcces, listerCotisations, declarerPaiement, lirePreuve, decider };