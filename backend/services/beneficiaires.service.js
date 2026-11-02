// Ce service applique les règles de l'ordre de passage, du démarrage de la tontine et du calendrier des tours.
const depot = require('../depots/beneficiaires.depot');
const depotTontines = require('../depots/tontines.depot');
const { lireIdentifiant, lireDate, debutDeJournee } = require('../utils/validation');
const { DonneesInvalides, Interdit, NonTrouve, Conflit } = require('../erreurs/erreursMetier');

// ---------- Contrôles d'accès ----------

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
  return roleCode;
}

// Cette fonction refuse tout le monde sauf le gérant de la tontine.
async function exigerGerant(utilisateurId, tontineId) {
  const roleCode = await depotTontines.trouverRole(utilisateurId, tontineId);
  if (roleCode !== 'gerant') throw new Interdit('Réservé au gérant de la tontine');
}

// ---------- Calculs (sans base de données) ----------

// Cette fonction calcule la date du tour numéro (decalage + 1) à partir de la date de début et de la fréquence.
function dateDuTour(dateDebut, frequence, decalage) {
  const unJour = 86400000;
  if (frequence === 'quotidien') return new Date(dateDebut.getTime() + decalage * unJour);
  if (frequence === 'hebdomadaire') return new Date(dateDebut.getTime() + decalage * 7 * unJour);
  // Mensuel : on part toujours de la date de début pour éviter la dérive 31 -> 28 -> 28.
  const annee = dateDebut.getUTCFullYear();
  const mois = dateDebut.getUTCMonth() + decalage;
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  return new Date(Date.UTC(annee, mois, Math.min(dateDebut.getUTCDate(), dernierJour)));
}

// Cette fonction vérifie que les ordres de passage valent exactement 1, 2, 3 ... N.
function ordreEstComplet(participants) {
  const ordres = participants.map((participant) => participant.ordrePassage).sort((a, b) => a - b);
  return ordres.every((ordre, index) => ordre === index + 1);
}

// Cette fonction met en forme la liste des membres avec leur ordre pour le GET et le PUT.
function formaterOrdre(tontine, participations) {
  const membres = participations.map(({ roleCode, ordrePassage, utilisateur }) => ({
    utilisateur_id: utilisateur.id, nom: utilisateur.nom, photo: utilisateur.photo,
    role_code: roleCode, ordre_passage: ordrePassage,
  }));
  // Ordre croissant ; ceux sans ordre à la fin, puis par nom.
  membres.sort((a, b) => {
    const ordreA = a.ordre_passage ?? Infinity;
    const ordreB = b.ordre_passage ?? Infinity;
    if (ordreA !== ordreB) return ordreA - ordreB;
    return a.nom.localeCompare(b.nom);
  });
  const ordreDefini = membres.length > 0 && membres.every((membre, index) => membre.ordre_passage === index + 1);
  return { tontine_id: tontine.id, statut: tontine.statut, ordre_defini: ordreDefini, membres };
}

// Cette fonction met en forme le calendrier commun au GET et au POST de démarrage.
function formaterCalendrier(tontine, tours) {
  const enTexte = (date) => (date ? date.toISOString().slice(0, 10) : null);
  const tourEnCours = tours.find((tour) => tour.statut === 'en_cours');
  return {
    tontine_id: tontine.id,
    statut: tontine.statut,
    date_debut: enTexte(tontine.dateDebut),
    tour_en_cours: tourEnCours ? tourEnCours.numero : null,
    tours: tours.map((tour) => ({
      tour_id: tour.id, numero: tour.numero, date_prevue: enTexte(tour.datePrevue),
      montant_cagnotte: tour.montantCagnotte, statut: tour.statut, date_remise: enTexte(tour.dateRemise),
      beneficiaire: tour.beneficiaire
        ? { utilisateur_id: tour.beneficiaire.utilisateur.id, nom: tour.beneficiaire.utilisateur.nom, photo: tour.beneficiaire.utilisateur.photo }
        : null,
    })),
  };
}

// ---------- Opérations ----------

// Cette fonction renvoie l'ordre de passage à tout participant.
async function lireOrdre(utilisateurId, tontineIdBrut) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  await exigerParticipant(utilisateurId, tontineId);
  const tontine = await depot.trouverTontine(tontineId);
  if (!tontine) throw new NonTrouve('Tontine introuvable');
  return formaterOrdre(tontine, await depot.listerParticipationsAvecComptes(tontineId));
}

// Cette fonction remplace l'ordre de passage ; seul le gérant peut le faire, avant le démarrage.
async function definirOrdre(utilisateurId, tontineIdBrut, ordre) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  await exigerGerant(utilisateurId, tontineId);
  // La liste doit exister, ne pas être vide, et ne contenir que des entiers supérieurs ou égaux à 1.
  if (!Array.isArray(ordre) || ordre.length === 0 || ordre.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new DonneesInvalides('Liste d’ordre invalide');
  }
  if (new Set(ordre).size !== ordre.length) throw new DonneesInvalides('Un membre apparaît plusieurs fois');

  return depot.dansTransaction(async (transaction) => {
    // Le verrou garantit qu'un démarrage simultané attend la fin de cette transaction.
    const tontine = await depot.verrouillerTontine(tontineId, transaction);
    if (!tontine) throw new NonTrouve('Tontine introuvable');
    if (tontine.statut !== 'en_preparation') throw new DonneesInvalides('Ordre figé : la tontine est démarrée');

    // On relit les participants : un ajout de membre a pu avoir lieu depuis le contrôle du rôle.
    const participants = await depot.listerParticipants(tontineId, transaction);
    const attendus = new Set(participants.map((participant) => participant.utilisateurId));
    const listeComplete = participants.length === ordre.length && ordre.every((id) => attendus.has(id));
    if (!listeComplete) throw new DonneesInvalides('La liste doit contenir exactement les membres de la tontine');

    for (const [index, utilisateurIdMembre] of ordre.entries()) {
      await depot.enregistrerPosition(utilisateurIdMembre, tontineId, index + 1, transaction);
    }
    return formaterOrdre(tontine, await depot.listerParticipationsAvecComptes(tontineId, transaction));
  });
}

// Cette fonction démarre la tontine : elle crée un tour par membre et une cotisation par membre et par tour.
async function demarrerTontine(utilisateurId, tontineIdBrut, dateDebutBrute) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  await exigerGerant(utilisateurId, tontineId);
  // La date de début doit être une vraie date, aujourd'hui ou plus tard.
  const dateDebut = lireDate(dateDebutBrute);
  if (!dateDebut) throw new DonneesInvalides('Date de début invalide');
  if (dateDebut < debutDeJournee()) throw new DonneesInvalides('La date de début ne peut pas être dans le passé');

  return depot.dansTransaction(async (transaction) => {
    // Deux démarrages simultanés se croisent ici : le second attend, puis voit "actif" et reçoit le refus 409.
    const verrou = await depot.verrouillerTontine(tontineId, transaction);
    if (!verrou) throw new NonTrouve('Tontine introuvable');
    if (verrou.statut !== 'en_preparation') throw new Conflit('La tontine est déjà démarrée');

    const tontine = await depot.trouverTontine(tontineId, transaction);
    const participants = await depot.listerParticipants(tontineId, transaction);
    if (participants.length !== tontine.nombreMembres) throw new DonneesInvalides('Tous les membres doivent être inscrits avant le démarrage');
    if (!ordreEstComplet(participants)) throw new DonneesInvalides('L’ordre de passage doit être défini avant le démarrage');

    // Le premier de la liste reçoit au tour 1.
    const parOrdre = [...participants].sort((a, b) => a.ordrePassage - b.ordrePassage);
    // Cagnotte = nombre de membres x montant ; ".mul" multiplie un Decimal sans erreur d'arrondi.
    const cagnotte = tontine.montantCotisation.mul(participants.length);

    await depot.activerTontine(tontineId, dateDebut, transaction);
    for (const [index, beneficiaire] of parOrdre.entries()) {
      const datePrevue = dateDuTour(dateDebut, tontine.frequence, index);
      const tourId = await depot.creerTour({
        tontineId, beneficiaireId: beneficiaire.id, numero: index + 1, datePrevue,
        montantCagnotte: cagnotte, statut: index === 0 ? 'en_cours' : 'a_venir',
      }, transaction);
      await depot.creerCotisations(parOrdre.map((payeur) => ({
        participationId: payeur.id, tourId, montant: tontine.montantCotisation, dateEcheance: datePrevue, statut: 'non_paye',
      })), transaction);
    }

    const tontineActive = await depot.trouverTontine(tontineId, transaction);
    return { message: 'Tontine démarrée', ...formaterCalendrier(tontineActive, await depot.listerTours(tontineId, transaction)) };
  });
}

// Cette fonction renvoie le calendrier des tours à tout participant.
async function lireCalendrier(utilisateurId, tontineIdBrut) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  await exigerParticipant(utilisateurId, tontineId);
  const tontine = await depot.trouverTontine(tontineId);
  if (!tontine) throw new NonTrouve('Tontine introuvable');
  return formaterCalendrier(tontine, await depot.listerTours(tontineId));
}

// Cette fonction enregistre la remise de la cagnotte du tour en cours et fait avancer la tontine.
async function marquerRemise(utilisateurId, tontineIdBrut, numeroBrut) {
  const tontineId = exigerIdentifiant(tontineIdBrut);
  await exigerGerant(utilisateurId, tontineId);
  const numero = lireIdentifiant(numeroBrut);
  if (!numero) throw new DonneesInvalides('Numéro de tour invalide');

  return depot.dansTransaction(async (transaction) => {
    // Le verrou fait attendre un second appel simultané : il verra le tour déjà terminé et recevra le refus 409.
    const verrou = await depot.verrouillerTontine(tontineId, transaction);
    if (!verrou) throw new NonTrouve('Tontine introuvable');
    const tour = await depot.trouverTourParNumero(tontineId, numero, transaction);
    if (!tour) throw new NonTrouve('Tour introuvable');
    if (verrou.statut !== 'actif') throw new Conflit('La tontine n’est pas active');
    // Seul le tour en cours peut être remis : pas de saut de tour.
    if (tour.statut !== 'en_cours') throw new Conflit('Ce tour n’est pas le tour en cours');

    // Toute la cagnotte doit être réunie : chaque membre, bénéficiaire compris, a une cotisation validée.
    const restantes = await depot.compterCotisationsNonPayees(tour.id, transaction);
    if (restantes > 0) throw new Conflit(`Il reste ${restantes} cotisation(s) non payée(s) ou en attente de validation`);

    // Le tour se termine ; si l'écriture ne modifie rien, un autre appel l'a terminé juste avant.
    const terminees = await depot.terminerTour(tour.id, debutDeJournee(), transaction);
    if (terminees === 0) throw new Conflit('Ce tour n’est pas le tour en cours');
    // Le tour suivant démarre ; s'il n'y en a pas, c'était le dernier et la tontine est terminée.
    const suivants = await depot.demarrerTour(tontineId, numero + 1, transaction);
    if (suivants === 0) await depot.terminerTontine(tontineId, transaction);

    const tontine = await depot.trouverTontine(tontineId, transaction);
    return { message: 'Remise enregistrée', ...formaterCalendrier(tontine, await depot.listerTours(tontineId, transaction)) };
  });
}

// Le contrôleur appelle ces opérations sans connaître Prisma.
module.exports = { lireOrdre, definirOrdre, demarrerTontine, lireCalendrier, marquerRemise };