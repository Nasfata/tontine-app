// jsonwebtoken : sert ici à VÉRIFIER le token envoyé par l'app
const jwt = require('jsonwebtoken');

// Un middleware reçoit 3 paramètres :
// req = la requête, res = la réponse, next = "passe à la suite"
function verifierToken(req, res, next) {
  // L'app envoie le token dans l'en-tête : "Authorization: Bearer xxxxx"
  const enTete = req.headers.authorization;

  // Si l'en-tête est absent ou mal formé, on refuse
  if (!enTete || !enTete.startsWith('Bearer ')) {
    // 401 = non authentifié
    return res.status(401).json({ erreur: 'Connexion requise' });
  }

  // On enlève "Bearer " (7 caractères) pour garder seulement le token
  const token = enTete.slice(7);

  try {
    // verify() décode le token avec notre clé secrète.
    // Si le token est faux ou expiré, elle lance une erreur (donc le catch)
    const donnees = jwt.verify(token, process.env.JWT_SECRET);

    // On garde l'id dans req : les routes suivantes pourront l'utiliser
    req.utilisateurId = donnees.id;

    // Tout est bon : on passe à la route demandée
    next();
  } catch (err) {
    return res.status(401).json({ erreur: 'Session invalide, reconnecte-toi' });
  }
}

// Export pour l'utiliser dans d'autres fichiers
module.exports = verifierToken;