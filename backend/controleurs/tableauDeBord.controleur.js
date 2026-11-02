// Ce contrôleur extrait les paramètres HTTP du tableau de bord et délègue au service.
const serviceTableauDeBord = require('../services/tableauDeBord.service');

// Ce helper renvoie le statut de l'erreur métier, ou une erreur serveur avec un texte propre à la route.
function erreurServeur(res, erreur, journal, message) {
  if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message });
  console.error(journal, erreur.message);
  return res.status(500).json({ erreur: message });
}

// Cette fonction répond au GET du tableau de bord.
async function lireTableauDeBord(req, res) {
  try {
    const resultat = await serviceTableauDeBord.lireTableauDeBord(req.utilisateurId, req.params.id);
    return res.json(resultat);
  } catch (erreur) {
    return erreurServeur(res, erreur, 'Erreur tableau de bord :', 'Erreur serveur lors de la lecture du tableau de bord');
  }
}

module.exports = { lireTableauDeBord };