// Ce contrôleur extrait les paramètres HTTP du suivi des paiements et délègue au service.
const serviceSuiviPaiements = require('../services/suiviPaiements.service');

// Ce helper renvoie le statut de l'erreur métier, ou une erreur serveur avec un texte propre à la route.
function erreurServeur(res, erreur, journal, message) {
  if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message });
  console.error(journal, erreur.message);
  return res.status(500).json({ erreur: message });
}

// Cette fonction répond au GET du suivi ; le tour demandé vient de l'adresse : ?tour=2.
async function lireSuivi(req, res) {
  try {
    const resultat = await serviceSuiviPaiements.lireSuivi(req.utilisateurId, req.params.id, req.query.tour);
    return res.json(resultat);
  } catch (erreur) {
    return erreurServeur(res, erreur, 'Erreur suivi des paiements :', 'Erreur serveur lors de la lecture du suivi des paiements');
  }
}

module.exports = { lireSuivi };