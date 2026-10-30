// Ce service valide et applique les changements demandés au profil.
const depotUtilisateurs = require('../depots/utilisateurs.depot');
const { normaliserTelephone } = require('../utils/telephone');
const { ErreurMetier } = require('../erreurs/erreursMetier');

// Cette fonction retourne le profil public avec un numéro normalisé.
async function lireProfil(id) {
  const utilisateur = await depotUtilisateurs.trouverProfilParId(id);
  if (!utilisateur) throw new ErreurMetier('Utilisateur introuvable', 404);
  return { ...utilisateur, telephone: normaliserTelephone(utilisateur.telephone) };
}

// Cette fonction vérifie les champs et le caractère unique du téléphone.
async function modifierProfil(id, donnees) {
  const nom = donnees.nom;
  const telephone = normaliserTelephone(donnees.telephone);
  if (!nom || !telephone) throw new ErreurMetier('Nom et téléphone requis', 400);
  const doublon = await depotUtilisateurs.trouverDoublonTelephone(telephone, id);
  if (doublon) throw new ErreurMetier('Ce numéro est déjà utilisé', 409);
  await depotUtilisateurs.modifierProfil(id, { nom, telephone });
  return { message: 'Profil mis à jour', nom, telephone };
}

// Cette fonction construit et enregistre le chemin de la photo reçue.
async function modifierPhoto(id, nomFichier) {
  const photo = `/uploads/${nomFichier}`;
  await depotUtilisateurs.modifierPhoto(id, photo);
  return { message: 'Photo mise à jour', photo };
}

// Le contrôleur utilise ces trois opérations de profil.
module.exports = { lireProfil, modifierProfil, modifierPhoto };
