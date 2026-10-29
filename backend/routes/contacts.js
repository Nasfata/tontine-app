// Express regroupe le point d'accès de correspondance des contacts.
const express = require('express');
// Le module natif calcule les empreintes SHA-256 côté serveur.
const crypto = require('crypto');
// Prisma permet de rechercher les comptes inscrits dans MySQL.
const db = require('../db');
// Le middleware limite cette route aux utilisateurs connectés.
const verifierToken = require('../middleware/auth');
// La normalisation doit être identique à celle utilisée à l'inscription.
const { normaliserTelephone } = require('../utils/telephone');
// Cette fonction vérifie le rôle du compte dans la tontine demandée.
const { verifierRole } = require('../utils/roles');

// Le routeur expose uniquement la recherche de correspondances.
const router = express.Router();
// Chaque appel nécessite un jeton valide.
router.use(verifierToken);

// Cette route compare les empreintes des contacts pour une tontine donnée.
router.post('/correspondance', async (req, res) => {
  try {
    // La tontine est transmise dans la chaîne de requête pour filtrer ses membres.
    const tontineId = req.query.tontineId;
    // Les empreintes sont la seule information de contact envoyée par l'application.
    const empreintesRecues = req.body?.empreintes;
    // L'identifiant doit être un entier positif.
    if (typeof tontineId !== 'string' || !/^\d+$/.test(tontineId) || Number(tontineId) < 1) {
      return res.status(400).json({ erreur: 'Un paramètre tontineId valide est requis' });
    }
    // Seul le gérant a besoin de consulter les suggestions pour ajouter des membres.
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    // Un utilisateur sans rôle de gérant ne reçoit aucune suggestion de compte.
    if (roleCode !== 'gerant') return res.status(403).json({ erreur: 'Seul le gérant peut consulter les suggestions de membres' });
    // Un lot est borné pour limiter la taille des requêtes envoyées au serveur.
    if (!Array.isArray(empreintesRecues) || empreintesRecues.length > 500) {
      return res.status(400).json({ erreur: 'Envoyez au maximum 500 empreintes par requête' });
    }
    // Chaque valeur doit être une empreinte SHA-256 hexadécimale complète.
    if (empreintesRecues.some((empreinte) => typeof empreinte !== 'string' || !/^[a-f0-9]{64}$/i.test(empreinte))) {
      return res.status(400).json({ erreur: 'Une ou plusieurs empreintes sont invalides' });
    }
    // Un lot vide ne nécessite aucune lecture de la table des utilisateurs.
    if (empreintesRecues.length === 0) return res.json([]);
    // L'ensemble accélère la comparaison locale et ignore les empreintes répétées.
    const empreintes = new Set(empreintesRecues.map((empreinte) => empreinte.toLowerCase()));
    // Cette requête exclut les membres déjà inscrits et l'utilisateur appelant.
    const utilisateurs = await db.utilisateur.findMany({
      where: {
        id: { not: req.utilisateurId },
        participations: { none: { tontineId: Number(tontineId) } },
      },
      select: { id: true, nom: true, photo: true, telephone: true },
    });
    // Le serveur calcule le hash à partir du numéro canonique déjà enregistré.
    const correspondances = utilisateurs.filter((utilisateur) => {
      // Les entrées sans numéro ne peuvent pas correspondre à une empreinte.
      const telephone = normaliserTelephone(utilisateur.telephone);
      // Un compte n'est retenu que si l'empreinte fait partie du lot reçu.
      if (!telephone) return false;
      // Le hash identique permet la comparaison sans renvoyer de numéro au client.
      const empreinte = crypto.createHash('sha256').update(telephone).digest('hex');
      // Seuls les comptes correspondants sont retenus.
      return empreintes.has(empreinte);
    }).map((utilisateur) => ({
      // L'identifiant sert à appeler l'API d'ajout du membre.
      id: utilisateur.id,
      // Le nom permet d'identifier la suggestion dans la liste.
      nom: utilisateur.nom,
      // La photo est facultative et peut être remplacée par une initiale.
      photo: utilisateur.photo,
    }));
    // La réponse ne contient que les champs nécessaires à l'affichage des suggestions.
    return res.json(correspondances);
  } catch (err) {
    // L'erreur détaillée reste dans les journaux du serveur.
    console.error('Erreur correspondance contacts :', err.message);
    // Une erreur interne est renvoyée dans le format API habituel.
    return res.status(500).json({ erreur: 'Erreur serveur lors de la recherche de contacts' });
  }
});

// Le serveur monte ce routeur sous /api/contacts.
module.exports = router;
