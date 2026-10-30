// Ce service applique les règles d'inscription et de connexion des comptes.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const depotUtilisateurs = require('../depots/utilisateurs.depot');
const { normaliserTelephone } = require('../utils/telephone');
const { ErreurMetier } = require('../erreurs/erreursMetier');

// Ce helper crée le jeton historique valable sept jours.
function creerToken(idUtilisateur) {
  return jwt.sign({ id: idUtilisateur }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Cette fonction valide et crée un compte puis renvoie sa représentation publique.
async function inscrire({ nom, telephone: telephoneSaisi, motDePasse }) {
  const telephone = normaliserTelephone(telephoneSaisi);
  if (!nom || !telephone || !motDePasse) throw new ErreurMetier('Nom, téléphone et mot de passe requis', 400);
  if (motDePasse.length < 6) throw new ErreurMetier('Le mot de passe doit avoir 6 caractères minimum', 400);
  const existant = await depotUtilisateurs.trouverUtilisateurParTelephone(telephone);
  if (existant) throw new ErreurMetier('Ce numéro a déjà un compte', 409);
  const motDePasseHash = await bcrypt.hash(motDePasse, 10);
  const utilisateur = await depotUtilisateurs.creerUtilisateur({ nom, telephone, motDePasseHash });
  return { token: creerToken(utilisateur.id), utilisateur: { id: utilisateur.id, nom, telephone, photo: null } };
}

// Cette fonction vérifie les identifiants et ne divulgue jamais le hash.
async function connecter({ telephone: telephoneSaisi, motDePasse }) {
  const telephone = normaliserTelephone(telephoneSaisi);
  if (!telephone || !motDePasse) throw new ErreurMetier('Téléphone et mot de passe requis', 400);
  const utilisateur = await depotUtilisateurs.trouverUtilisateurPourConnexion(telephone);
  if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.motDePasseHash))) {
    throw new ErreurMetier('Téléphone ou mot de passe incorrect', 401);
  }
  return {
    token: creerToken(utilisateur.id),
    utilisateur: { id: utilisateur.id, nom: utilisateur.nom, telephone: utilisateur.telephone, photo: utilisateur.photo },
  };
}

// Le contrôleur appelle ces opérations sans connaître les règles internes.
module.exports = { inscrire, connecter };
