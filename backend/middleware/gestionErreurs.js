// Ce middleware transforme les erreurs non traitées en réponses JSON cohérentes.
function gestionErreurs(erreur, req, res, next) {
  // Les contrôleurs peuvent définir un statut métier sur l'erreur.
  const statut = Number.isInteger(erreur.statut) ? erreur.statut : 500;
  // Le client reçoit uniquement un message et jamais les détails techniques.
  return res.status(statut).json({ erreur: statut === 500 ? 'Erreur serveur' : erreur.message });
}

// Express utilise cette fonction après les routes.
module.exports = gestionErreurs;
