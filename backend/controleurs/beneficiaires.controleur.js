// Ce contrôleur extrait les paramètres HTTP et délègue l'ordre de passage, le démarrage et le calendrier au service.
const serviceBeneficiaires = require('../services/beneficiaires.service');

// Ce helper renvoie le statut de l'erreur métier, ou une erreur serveur avec le texte historique de la route.
function erreurServeur(res, erreur, journal, message) {
  if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message });
  console.error(journal, erreur.message);
  return res.status(500).json({ erreur: message });
}

// Cette fonction renvoie l'ordre de passage de la tontine.
async function lireOrdre(req, res) {
  try { return res.json(await serviceBeneficiaires.lireOrdre(req.utilisateurId, req.params.id)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur lecture ordre :', 'Erreur serveur lors de la lecture de l’ordre de passage'); }
}

// Cette fonction enregistre le nouvel ordre de passage envoyé par le gérant.
async function definirOrdre(req, res) {
  try { return res.json(await serviceBeneficiaires.definirOrdre(req.utilisateurId, req.params.id, req.body?.ordre)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur définition ordre :', 'Erreur serveur lors de l’enregistrement de l’ordre de passage'); }
}

// Cette fonction démarre la tontine à la date envoyée par le gérant.
async function demarrerTontine(req, res) {
  try { return res.status(201).json(await serviceBeneficiaires.demarrerTontine(req.utilisateurId, req.params.id, req.body?.date_debut)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur démarrage tontine :', 'Erreur serveur lors du démarrage de la tontine'); }
}

// Cette fonction renvoie le calendrier des tours de la tontine.
async function lireCalendrier(req, res) {
  try { return res.json(await serviceBeneficiaires.lireCalendrier(req.utilisateurId, req.params.id)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur lecture calendrier :', 'Erreur serveur lors de la lecture du calendrier'); }
}

// Le routeur associe ces actions aux chemins HTTP.
module.exports = { lireOrdre, definirOrdre, demarrerTontine, lireCalendrier };