// Express fournit le routeur : un petit groupe de routes rangé dans son propre fichier.
const express = require('express');
// db est le client Prisma, notre porte d'entrée vers MySQL.
const db = require('../db');
// Ce middleware vérifie le jeton de connexion et remplit req.utilisateurId.
const verifierToken = require('../middleware/auth');
// Cette fonction renvoie le rôle de la personne dans une tontine (null si elle n'y participe pas).
const { verifierRole } = require('../utils/roles');

// Crée le routeur de ce fichier.
const router = express.Router();

// Toutes les routes de ce fichier exigent d'être connecté.
router.use(verifierToken);

// Convertit un texte de l'adresse (ex : "4") en entier positif, ou renvoie null s'il est invalide.
function lireIdentifiant(valeur) {
  // Number("4") donne 4, mais Number("abc") donne NaN (pas un nombre).
  const nombre = Number(valeur);
  // On n'accepte que les entiers supérieurs ou égaux à 1.
  return Number.isInteger(nombre) && nombre >= 1 ? nombre : null;
}

// Prépare la réponse commune au GET et au PUT : la liste des membres avec leur ordre.
// "client" est soit db (hors transaction), soit l'objet de transaction (dans une transaction).
async function construireOrdre(client, tontine) {
  // On lit chaque participation avec les informations publiques de la personne.
  const participations = await client.participation.findMany({
    where: { tontineId: tontine.id },
    select: {
      roleCode: true,
      ordrePassage: true,
      utilisateur: { select: { id: true, nom: true, photo: true } },
    },
  });

  // On trie : ordre croissant, ceux sans ordre à la fin, puis par nom.
  participations.sort((a, b) => {
    // "??" donne Infinity quand l'ordre est null, pour le placer en dernier.
    const ordreA = a.ordrePassage ?? Infinity;
    const ordreB = b.ordrePassage ?? Infinity;
    // Si les ordres diffèrent, le plus petit passe en premier.
    if (ordreA !== ordreB) return ordreA - ordreB;
    // Sinon, on trie par ordre alphabétique des noms.
    return a.utilisateur.nom.localeCompare(b.utilisateur.nom);
  });

  // L'ordre est défini si la liste triée est exactement 1, 2, 3 ... N (sans trou ni doublon).
  const ordreDefini = participations.length > 0
    && participations.every((participation, index) => participation.ordrePassage === index + 1);

  // On renvoie la forme annoncée dans le contrat, en snake_case comme le reste de l'API.
  return {
    tontine_id: tontine.id,
    statut: tontine.statut,
    ordre_defini: ordreDefini,
    membres: participations.map((participation) => ({
      utilisateur_id: participation.utilisateur.id,
      nom: participation.utilisateur.nom,
      photo: participation.utilisateur.photo,
      role_code: participation.roleCode,
      ordre_passage: participation.ordrePassage,
    })),
  };
}

// GET /api/tontines/:id/ordre : tout participant peut voir l'ordre de passage.
router.get('/:id/ordre', async (req, res) => {
  try {
    // On lit et on vérifie l'identifiant de la tontine dans l'adresse.
    const tontineId = lireIdentifiant(req.params.id);
    if (!tontineId) return res.status(400).json({ erreur: 'Identifiant invalide' });

    // Seul un participant a un rôle ici ; sinon c'est un refus (403).
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    if (!roleCode) return res.status(403).json({ erreur: 'Vous ne participez pas à cette tontine' });

    // On lit la tontine (garde-fou si elle a disparu entre-temps).
    const tontine = await db.tontine.findUnique({ where: { id: tontineId }, select: { id: true, statut: true } });
    if (!tontine) return res.status(404).json({ erreur: 'Tontine introuvable' });

    // On renvoie la liste ordonnée au client.
    return res.json(await construireOrdre(db, tontine));
  } catch (err) {
    // Le détail de l'erreur reste dans le terminal, le client reçoit un message simple.
    console.error('Erreur lecture ordre :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture de l’ordre de passage' });
  }
});

// PUT /api/tontines/:id/ordre : le gérant remplace l'ordre de passage.
router.put('/:id/ordre', async (req, res) => {
  try {
    // On lit et on vérifie l'identifiant de la tontine.
    const tontineId = lireIdentifiant(req.params.id);
    if (!tontineId) return res.status(400).json({ erreur: 'Identifiant invalide' });

    // Seul le gérant de cette tontine peut modifier l'ordre.
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    if (roleCode !== 'gerant') return res.status(403).json({ erreur: 'Réservé au gérant de la tontine' });

    // "?." évite une erreur si req.body est absent.
    const ordre = req.body?.ordre;
    // La liste doit exister, ne pas être vide, et ne contenir que des entiers supérieurs ou égaux à 1.
    if (!Array.isArray(ordre) || ordre.length === 0 || ordre.some((id) => !Number.isInteger(id) || id < 1)) {
      return res.status(400).json({ erreur: 'Liste d’ordre invalide' });
    }
    // Un Set ne garde que des valeurs uniques : si sa taille est plus petite, il y a un doublon.
    if (new Set(ordre).size !== ordre.length) {
      return res.status(400).json({ erreur: 'Un membre apparaît plusieurs fois' });
    }

    // Tout ce qui suit réussit ensemble ou est annulé ensemble.
    const resultat = await db.$transaction(async (transaction) => {
      // On relit la tontine à l'intérieur de la transaction.
      const tontine = await transaction.tontine.findUnique({ where: { id: tontineId }, select: { id: true, statut: true } });
      if (!tontine) return { erreur: 'Tontine introuvable', statut: 404 };
      // L'ordre n'est modifiable qu'avant le démarrage.
      if (tontine.statut !== 'en_preparation') return { erreur: 'Ordre figé : la tontine est démarrée', statut: 400 };

      // On relit les participants actuels : un ajout de membre a pu avoir lieu depuis la vérification du rôle.
      const participations = await transaction.participation.findMany({
        where: { tontineId },
        select: { utilisateurId: true },
      });
      const identifiantsAttendus = new Set(participations.map((participation) => participation.utilisateurId));

      // La liste reçue doit contenir exactement les participants : même nombre, et aucun inconnu.
      const listeComplete = participations.length === ordre.length
        && ordre.every((utilisateurId) => identifiantsAttendus.has(utilisateurId));
      if (!listeComplete) return { erreur: 'La liste doit contenir exactement les membres de la tontine', statut: 400 };

      // On écrit la position (1, 2, 3...) de chaque membre.
      for (const [index, utilisateurId] of ordre.entries()) {
        await transaction.participation.update({
          where: { utilisateurId_tontineId: { utilisateurId, tontineId } },
          data: { ordrePassage: index + 1 },
        });
      }

      // On renvoie l'ordre tel qu'il est maintenant enregistré.
      return { reponse: await construireOrdre(transaction, tontine) };
    }, { isolationLevel: 'Serializable' });

    // Si la transaction a signalé une erreur métier, on la traduit en réponse HTTP.
    if (resultat.erreur) return res.status(resultat.statut).json({ erreur: resultat.erreur });
    return res.json(resultat.reponse);
  } catch (err) {
    console.error('Erreur définition ordre :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de l’enregistrement de l’ordre de passage' });
  }
});

// Le routeur est branché sous /api/tontines par server.js.
module.exports = router;