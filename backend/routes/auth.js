// Express : on en a besoin pour créer un "Router" (un groupe de routes)
const express = require('express');

// bcryptjs : transforme un mot de passe en "hash" illisible et irréversible
const bcrypt = require('bcryptjs');

// jsonwebtoken : crée et vérifie les tokens de connexion
const jwt = require('jsonwebtoken');

// Notre connexion MySQL (le fichier db.js est un dossier plus haut, d'où "../")
const db = require('../db');
// Cette fonction harmonise le numéro avant les recherches et les écritures.
const { normaliserTelephone } = require('../utils/telephone');

// Un Router permet de ranger nos routes dans un fichier séparé de server.js
const router = express.Router();

// ---------- Fonction utilitaire : crée un token pour un utilisateur ----------
function creerToken(idUtilisateur) {
  // jwt.sign(contenu, cléSecrète, options)
  return jwt.sign(
    { id: idUtilisateur },          // ce qu'on cache dans le token : l'id de l'utilisateur
    process.env.JWT_SECRET,         // la clé secrète du fichier .env
    { expiresIn: '7d' }             // le token expire après 7 jours
  );
}

// ======================================================================
// INSCRIPTION  →  POST /api/auth/inscription
// ======================================================================
// async = on va utiliser "await" pour attendre MySQL et bcrypt
router.post('/inscription', async (req, res) => {
  try {
    // req.body = le JSON envoyé par l'app.
    // On "extrait" les 3 champs dont on a besoin.
    const { nom, telephone: telephoneSaisi, motDePasse } = req.body;
    // Le numéro enregistré ne contient pas d'espaces, points ou tirets.
    const telephone = normaliserTelephone(telephoneSaisi);

    // Vérifie que les 3 champs sont remplis
    if (!nom || !telephone || !motDePasse) {
      // 400 = requête incorrecte. "return" arrête la fonction ici.
      return res.status(400).json({ erreur: 'Nom, téléphone et mot de passe requis' });
    }

    // Vérifie la longueur minimale du mot de passe
    if (motDePasse.length < 6) {
      return res.status(400).json({ erreur: 'Le mot de passe doit avoir 6 caractères minimum' });
    }

    // Prisma recherche le compte par téléphone sans assembler une requête SQL.
    const existant = await db.utilisateur.findUnique({
      where: { telephone },
      select: { id: true },
    });

    // Si on a trouvé au moins une ligne, le numéro est déjà pris
    if (existant) {
      // 409 = conflit
      return res.status(409).json({ erreur: 'Ce numéro a déjà un compte' });
    }

    // Hash du mot de passe. Le "10" est le niveau de sécurité (10 = bon standard).
    // await = on attend que le calcul soit fini
    const hash = await bcrypt.hash(motDePasse, 10);

    // Insère le nouvel utilisateur dans la table Utilisateur
    const utilisateurCree = await db.utilisateur.create({
      data: { nom, telephone, motDePasseHash: hash },
      select: { id: true },
    });

    // L'identifiant est attribué automatiquement par MySQL.
    const id = utilisateurCree.id;

    // 201 = "créé avec succès".
    // On renvoie le token tout de suite : l'utilisateur est connecté directement
    // (le cahier dit : "puis est redirigé vers son tableau de bord").
    res.status(201).json({
      token: creerToken(id),
      utilisateur: { id, nom, telephone, photo: null },
    });
  } catch (err) {
    // Si une erreur inattendue arrive, on l'affiche dans le terminal
    console.error('Erreur inscription :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ======================================================================
// CONNEXION  →  POST /api/auth/connexion
// ======================================================================
router.post('/connexion', async (req, res) => {
  try {
    // On récupère téléphone et mot de passe envoyés par l'app
    const { telephone: telephoneSaisi, motDePasse } = req.body;
    // La même normalisation est utilisée pour rechercher le compte.
    const telephone = normaliserTelephone(telephoneSaisi);

    // Vérifie que les deux champs sont remplis
    if (!telephone || !motDePasse) {
      return res.status(400).json({ erreur: 'Téléphone et mot de passe requis' });
    }

    // Cherche l'utilisateur par son numéro de téléphone
    const utilisateur = await db.utilisateur.findUnique({
      where: { telephone },
      select: { id: true, nom: true, telephone: true, photo: true, motDePasseHash: true },
    });

    // lignes[0] = le premier résultat (ou "undefined" si personne n'a ce numéro)
    // Même message d'erreur si le numéro OU le mot de passe est faux :
    // ça évite de révéler quels numéros ont un compte.
    if (!utilisateur) {
      // 401 = non autorisé
      return res.status(401).json({ erreur: 'Téléphone ou mot de passe incorrect' });
    }

    // bcrypt.compare : hash le mot de passe saisi et le compare au hash stocké.
    // Renvoie true si ça correspond, false sinon.
    const motDePasseOk = await bcrypt.compare(motDePasse, utilisateur.motDePasseHash);

    if (!motDePasseOk) {
      return res.status(401).json({ erreur: 'Téléphone ou mot de passe incorrect' });
    }

    // Tout est bon : on renvoie le token et les infos de l'utilisateur.
    // IMPORTANT : on n'envoie PAS le hash du mot de passe.
    res.json({
      token: creerToken(utilisateur.id),
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        telephone: utilisateur.telephone,
        photo: utilisateur.photo,
      },
    });
  } catch (err) {
    console.error('Erreur connexion :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// On exporte le router pour le brancher dans server.js
module.exports = router;
