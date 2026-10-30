// Ce contrôleur relie la route de diagnostic au service correspondant.
const serviceDiagnostic = require('../services/diagnostic.service');

// La lecture des rôles conserve le format historique de la réponse.
async function lireRoles(req, res) {
  try {
    return res.json(await serviceDiagnostic.lireRoles());
  } catch (erreur) {
    console.error('Erreur base de données :', erreur.message);
    return res.status(500).json({ erreur: 'Impossible de lire les rôles dans la base de données' });
  }
}

// Le routeur de diagnostic utilise ce contrôleur.
module.exports = { lireRoles };
