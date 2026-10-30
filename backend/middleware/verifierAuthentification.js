// Ce middleware valide le jeton Bearer et ajoute l'identifiant du compte à la requête.
const jwt = require('jsonwebtoken');

// Les routes protégées s'arrêtent ici si le jeton est absent ou invalide.
function verifierAuthentification(req, res, next) {
  // L'application transmet le jeton dans l'en-tête Authorization.
  const enTete = req.headers.authorization;
  if (!enTete || !enTete.startsWith('Bearer ')) return res.status(401).json({ erreur: 'Connexion requise' });
  try {
    // Le jeton validé contient l'identifiant utilisé par les contrôleurs.
    const donnees = jwt.verify(enTete.slice(7), process.env.JWT_SECRET);
    req.utilisateurId = donnees.id;
    return next();
  } catch (erreur) {
    // Le message reste identique au comportement historique.
    return res.status(401).json({ erreur: 'Session invalide, reconnecte-toi' });
  }
}

// Les fichiers de routes utilisent ce middleware.
module.exports = verifierAuthentification;
