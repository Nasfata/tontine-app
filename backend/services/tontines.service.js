// Ce service applique les règles de création, d'accès et de gestion des tontines.
const depotTontines = require('../depots/tontines.depot');
const { normaliserTelephone } = require('../utils/telephone');
const { ErreurMetier } = require('../erreurs/erreursMetier');

// Cette fonction valide les champs puis crée la tontine avec son gérant.
async function creerTontine(utilisateurId, champs) {
  const { nom, montant_cotisation, frequence, nombre_membres, regles } = champs;
  const montant = Number(montant_cotisation);
  const frequencesAutorisees = ['quotidien', 'hebdomadaire', 'mensuel'];
  if (typeof nom !== 'string' || !nom.trim()) throw new ErreurMetier('Le nom de la tontine est obligatoire', 400);
  if (!Number.isFinite(montant) || montant <= 0) throw new ErreurMetier('Le montant de cotisation doit être supérieur à zéro', 400);
  if (!frequencesAutorisees.includes(frequence)) throw new ErreurMetier('La fréquence doit être quotidien, hebdomadaire ou mensuel', 400);
  if (!Number.isInteger(nombre_membres) || nombre_membres < 2) throw new ErreurMetier('Le nombre de membres doit être un entier supérieur ou égal à 2', 400);
  const tontine = await depotTontines.creerTontineAvecGerant(utilisateurId, {
    nom: nom.trim(), montantCotisation: montant, frequence, nombreMembres: nombre_membres, regles: regles ?? null,
  });
  return { message: 'Tontine créée', id: tontine.id, statut: 'en_preparation' };
}

// Cette fonction adapte les enregistrements Prisma à la forme publique actuelle.
async function listerTontines(utilisateurId) {
  const participations = await depotTontines.listerTontinesUtilisateur(utilisateurId);
  return participations.map(({ tontine, roleCode, role }) => ({
    id: tontine.id, nom: tontine.nom, montant_cotisation: tontine.montantCotisation,
    frequence: tontine.frequence, nombre_membres: tontine.nombreMembres, regles: tontine.regles,
    statut: tontine.statut, role_code: roleCode, libelle_role: role?.libelle ?? null,
    nombre_membres_inscrits: tontine._count.participations,
  }));
}

// Cette fonction contrôle l'appartenance puis prépare le détail complet.
async function lireTontine(utilisateurId, tontineId) {
  const roleCode = await depotTontines.trouverRole(utilisateurId, tontineId);
  if (!roleCode) throw new ErreurMetier('Vous ne participez pas à cette tontine', 403);
  const tontine = await depotTontines.trouverTontineParId(tontineId);
  if (!tontine) throw new ErreurMetier('Tontine introuvable', 404);
  const participations = await depotTontines.listerMembres(tontine.id);
  const unitesDuree = { quotidien: 'jours', hebdomadaire: 'semaines', mensuel: 'mois' };
  return {
    tontine: { id: tontine.id, nom: tontine.nom, montant_cotisation: tontine.montantCotisation, frequence: tontine.frequence, nombre_membres: tontine.nombreMembres, regles: tontine.regles, statut: tontine.statut },
    role_code: roleCode,
    membres: participations.map(({ utilisateur, roleCode: role }) => ({ utilisateur_id: utilisateur.id, nom: utilisateur.nom, photo: utilisateur.photo, role_code: role })),
    duree_cycle: { nombre: tontine.nombreMembres, unite: unitesDuree[tontine.frequence] },
  };
}

// Cette fonction autorise seulement le gérant à ajouter un compte existant.
async function rejoindreTontine(utilisateurId, tontineId, champs) {
  const roleCode = await depotTontines.trouverRole(utilisateurId, tontineId);
  if (roleCode !== 'gerant') throw new ErreurMetier('Seul le gérant peut ajouter un membre', 403);
  const telephone = normaliserTelephone(champs?.telephone);
  const utilisateurIdCible = champs?.utilisateurId;
  const utiliserIdentifiant = Number.isInteger(utilisateurIdCible) && utilisateurIdCible > 0;
  if (!utiliserIdentifiant && !telephone) throw new ErreurMetier('Un numéro de téléphone ou un utilisateur valide est requis', 400);
  const resultat = await depotTontines.ajouterMembre(tontineId, utilisateurIdCible, telephone, utiliserIdentifiant);
  if (resultat.erreur) {
    const erreur = new ErreurMetier(resultat.erreur, resultat.statut);
    erreur.invitation = resultat.invitation;
    throw erreur;
  }
  return { message: 'Membre ajouté avec succès' };
}

// Cette fonction applique les droits et les conditions de retrait d'un membre.
async function retirerMembre(utilisateurId, tontineIdBrut, utilisateurIdBrut) {
  const tontineId = Number(tontineIdBrut);
  const utilisateurCible = Number(utilisateurIdBrut);
  if (!Number.isInteger(tontineId) || !Number.isInteger(utilisateurCible) || tontineId < 1 || utilisateurCible < 1) throw new ErreurMetier('Identifiants invalides', 400);
  const roleDemandeur = await depotTontines.trouverRole(utilisateurId, tontineId);
  if (roleDemandeur !== 'gerant') throw new ErreurMetier('Réservé au gérant de la tontine', 403);
  if (utilisateurCible === utilisateurId) throw new ErreurMetier('Le gérant ne peut pas se retirer de sa propre tontine', 400);
  const tontine = await depotTontines.trouverTontineParId(tontineId, { statut: true });
  if (!tontine) throw new ErreurMetier('Tontine introuvable', 404);
  if (tontine.statut !== 'en_preparation') throw new ErreurMetier('Impossible de retirer un membre une fois la tontine démarrée', 400);
  const participation = await depotTontines.trouverParticipation(utilisateurCible, tontineId);
  if (!participation) throw new ErreurMetier('Ce membre ne fait pas partie de la tontine', 404);
  const activites = await depotTontines.compterActivitesParticipation(participation.id);
  if (activites.nombreCotisations > 0 || activites.nombreTours > 0) throw new ErreurMetier('Ce membre a déjà des cotisations ou un tour : il ne peut pas être retiré', 409);
  await depotTontines.supprimerParticipation(participation.id);
  return { message: 'Membre retiré' };
}

// Le contrôleur appelle ces opérations sans connaître les requêtes Prisma.
module.exports = { creerTontine, listerTontines, lireTontine, rejoindreTontine, retirerMembre };
