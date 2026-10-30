// Ce contrôleur extrait les paramètres de la requête et appelle le service profil.
const serviceProfil = require('../services/profil.service');

// Cette fonction renvoie le profil de la personne connectée.
async function lireProfil(req, res) {
  try { return res.json(await serviceProfil.lireProfil(req.utilisateurId)); }
  catch (erreur) { if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message }); console.error('Erreur lecture profil :', erreur.message); return res.status(500).json({ erreur: 'Erreur serveur' }); }
}

// Cette fonction transmet les champs de modification du profil.
async function modifierProfil(req, res) {
  try { return res.json(await serviceProfil.modifierProfil(req.utilisateurId, req.body || {})); }
  catch (erreur) { if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message }); console.error('Erreur modification profil :', erreur.message); return res.status(500).json({ erreur: 'Erreur serveur' }); }
}

// Cette fonction enregistre la photo déjà reçue par Multer.
async function modifierPhoto(req, res) {
  try {
    if (!req.file) return res.status(400).json({ erreur: 'Aucune photo reçue' });
    const resultat = await serviceProfil.modifierPhoto(req.utilisateurId, req.file.filename);
    return res.json(resultat);
  } catch (erreur) { console.error('Erreur upload photo :', erreur.message); return res.status(500).json({ erreur: 'Erreur serveur' }); }
}

// Le routeur du profil utilise ces actions HTTP.
module.exports = { lireProfil, modifierProfil, modifierPhoto };
