// Ce contrôleur extrait les valeurs HTTP et appelle le service contacts.
const serviceContacts = require('../services/contacts.service');

// Cette fonction renvoie uniquement les correspondances d'une tontine demandée.
async function rechercherCorrespondances(req, res) {
  try {
    const resultat = await serviceContacts.rechercherCorrespondances(req.utilisateurId, req.query.tontineId, req.body?.empreintes);
    return res.json(resultat);
  } catch (erreur) {
    if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message });
    console.error('Erreur correspondance contacts :', erreur.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la recherche de contacts' });
  }
}

// Le routeur contacts associe ce contrôleur à sa méthode POST.
module.exports = { rechercherCorrespondances };
