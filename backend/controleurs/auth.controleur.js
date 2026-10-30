// Ce contrôleur lit les données auth et renvoie les réponses du service.
const serviceAuth = require('../services/auth.service');

// Cette fonction transmet la demande d'inscription au service.
async function inscrire(req, res) {
  try {
    const resultat = await serviceAuth.inscrire(req.body || {});
    return res.status(201).json(resultat);
  } catch (erreur) {
    if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message });
    console.error('Erreur inscription :', erreur.message);
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
}

// Cette fonction transmet la demande de connexion au service.
async function connecter(req, res) {
  try {
    const resultat = await serviceAuth.connecter(req.body || {});
    return res.json(resultat);
  } catch (erreur) {
    if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message });
    console.error('Erreur connexion :', erreur.message);
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
}

// Le routeur auth associe ces fonctions aux méthodes HTTP.
module.exports = { inscrire, connecter };
