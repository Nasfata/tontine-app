// Ce contrôleur extrait les paramètres HTTP et délègue les actions au service tontines.
const serviceTontines = require('../services/tontines.service');

// Ce helper renvoie une erreur serveur avec le texte historique de la route.
function erreurServeur(res, erreur, journal, message) {
  if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message, ...(erreur.invitation ? { invitation: true } : {}) });
  console.error(journal, erreur.message);
  return res.status(500).json({ erreur: message });
}

// Cette fonction crée une tontine pour le compte connecté.
async function creerTontine(req, res) {
  try { const resultat = await serviceTontines.creerTontine(req.utilisateurId, req.body || {}); return res.status(201).json(resultat); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur création tontine :', 'Erreur serveur lors de la création de la tontine'); }
}

// Cette fonction renvoie les tontines du compte connecté.
async function listerTontines(req, res) {
  try { return res.json(await serviceTontines.listerTontines(req.utilisateurId)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur liste tontines :', 'Erreur serveur lors de la lecture des tontines'); }
}

// Cette fonction renvoie le détail de la tontine demandée.
async function lireTontine(req, res) {
  try { const resultat = await serviceTontines.lireTontine(req.utilisateurId, req.params.id); return res.json(resultat); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur détail tontine :', 'Erreur serveur lors de la lecture de la tontine'); }
}

// Cette fonction ajoute le compte demandé à la tontine.
async function rejoindreTontine(req, res) {
  try { const resultat = await serviceTontines.rejoindreTontine(req.utilisateurId, req.params.id, req.body || {}); return res.status(201).json(resultat); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur ajout membre :', 'Erreur serveur lors de l’ajout du membre'); }
}

// Cette fonction retire un membre selon les droits du gérant.
async function retirerMembre(req, res) {
  try { const resultat = await serviceTontines.retirerMembre(req.utilisateurId, req.params.id, req.params.utilisateurId); return res.json(resultat); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur retrait membre :', 'Erreur serveur'); }
}

// Le routeur tontines associe ces actions aux méthodes HTTP existantes.
module.exports = { creerTontine, listerTontines, lireTontine, rejoindreTontine, retirerMembre };
