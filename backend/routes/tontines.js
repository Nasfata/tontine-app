// Express fournit le routeur utilisé pour les adresses liées aux tontines.
const express = require('express');
// Le client Prisma donne accès aux modèles déclarés dans prisma/schema.prisma.
const db = require('../db');
// Ce middleware vérifie le jeton et ajoute l'identifiant à la requête.
const verifierToken = require('../middleware/auth');
// Cette fonction lit le rôle de l'utilisateur dans une tontine donnée.
const { verifierRole } = require('../utils/roles');
// Cette fonction uniformise les numéros reçus par les routes.
const { normaliserTelephone } = require('../utils/telephone');

// Le routeur rassemble toutes les routes de tontines.
const router = express.Router();
// Toutes les routes de ce fichier demandent un utilisateur connecté.
router.use(verifierToken);

// Cette route crée la tontine et son gérant dans une transaction.
router.post('/', async (req, res) => {
  // On lit les champs envoyés par l'application.
  const { nom, montant_cotisation, frequence, nombre_membres, regles } = req.body;
  // Le montant est converti pour vérifier qu'il est bien numérique.
  const montant = Number(montant_cotisation);
  // Ces trois fréquences sont les seules acceptées par le schéma métier.
  const frequencesAutorisees = ['quotidien', 'hebdomadaire', 'mensuel'];
  // Le nom est obligatoire.
  if (typeof nom !== 'string' || !nom.trim()) return res.status(400).json({ erreur: 'Le nom de la tontine est obligatoire' });
  // Le montant doit être positif.
  if (!Number.isFinite(montant) || montant <= 0) return res.status(400).json({ erreur: 'Le montant de cotisation doit être supérieur à zéro' });
  // La fréquence doit appartenir à la liste autorisée.
  if (!frequencesAutorisees.includes(frequence)) return res.status(400).json({ erreur: 'La fréquence doit être quotidien, hebdomadaire ou mensuel' });
  // Le nombre de membres doit être un entier d'au moins deux personnes.
  if (!Number.isInteger(nombre_membres) || nombre_membres < 2) return res.status(400).json({ erreur: 'Le nombre de membres doit être un entier supérieur ou égal à 2' });
  try {
    // Les deux créations réussissent ou sont annulées ensemble.
    const tontine = await db.$transaction(async (transaction) => {
      const tontineCreee = await transaction.tontine.create({
        data: {
          nom: nom.trim(),
          montantCotisation: montant,
          frequence,
          nombreMembres: nombre_membres,
          regles: regles ?? null,
          statut: 'en_preparation',
        },
        select: { id: true },
      });
      await transaction.participation.create({
        data: { utilisateurId: req.utilisateurId, tontineId: tontineCreee.id, roleCode: 'gerant' },
      });
      return tontineCreee;
    });
    // Le client reçoit l'identifiant créé et le statut initial.
    return res.status(201).json({ message: 'Tontine créée', id: tontine.id, statut: 'en_preparation' });
  } catch (err) {
    // Le détail de la panne reste dans les journaux du serveur.
    console.error('Erreur création tontine :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la création de la tontine' });
  }
});

// Cette route liste uniquement les tontines de l'utilisateur connecté.
router.get('/', async (req, res) => {
  try {
    // Prisma récupère les tontines et le nombre de participants associé.
    const participations = await db.participation.findMany({
      where: { utilisateurId: req.utilisateurId },
      include: {
        tontine: { include: { _count: { select: { participations: true } } } },
        role: { select: { libelle: true } },
      },
      orderBy: { tontineId: 'desc' },
    });
    // On garde la forme de réponse utilisée par l'application mobile.
    const tontines = participations.map(({ tontine, roleCode, role }) => ({
      id: tontine.id,
      nom: tontine.nom,
      montant_cotisation: tontine.montantCotisation,
      frequence: tontine.frequence,
      nombre_membres: tontine.nombreMembres,
      regles: tontine.regles,
      statut: tontine.statut,
      role_code: roleCode,
      libelle_role: role?.libelle ?? null,
      nombre_membres_inscrits: tontine._count.participations,
    }));
    return res.json(tontines);
  } catch (err) {
    console.error('Erreur liste tontines :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture des tontines' });
  }
});

// Cette route ajoute un compte déjà inscrit à une tontine.
router.post('/:id/membres', async (req, res) => {
  // Le numéro est normalisé avant la recherche éventuelle.
  const telephone = normaliserTelephone(req.body?.telephone);
  // L'identifiant peut provenir d'une suggestion de contact.
  const utilisateurIdCible = req.body?.utilisateurId;
  // On vérifie si l'identifiant fourni est un entier positif.
  const utiliserIdentifiant = Number.isInteger(utilisateurIdCible) && utilisateurIdCible > 0;
  try {
    // Seul le gérant de cette tontine peut ajouter une personne.
    const roleCode = await verifierRole(req.utilisateurId, req.params.id);
    if (roleCode !== 'gerant') return res.status(403).json({ erreur: 'Seul le gérant peut ajouter un membre' });
    if (!utiliserIdentifiant && !telephone) return res.status(400).json({ erreur: 'Un numéro de téléphone ou un utilisateur valide est requis' });
    // Une transaction sérialisable protège le quota contre des ajouts simultanés.
    const resultat = await db.$transaction(async (transaction) => {
      const tontine = await transaction.tontine.findUnique({ where: { id: Number(req.params.id) } });
      if (!tontine) return { erreur: 'Tontine introuvable', statut: 404 };
      const nombreInscrits = await transaction.participation.count({ where: { tontineId: tontine.id } });
      if (nombreInscrits >= tontine.nombreMembres) return { erreur: 'La tontine a déjà atteint son nombre maximal de membres', statut: 400 };
      const utilisateur = utiliserIdentifiant
        ? await transaction.utilisateur.findUnique({ where: { id: utilisateurIdCible }, select: { id: true } })
        : await transaction.utilisateur.findUnique({ where: { telephone }, select: { id: true } });
      if (!utilisateur) return utiliserIdentifiant
        ? { erreur: 'Utilisateur introuvable', statut: 404 }
        : { erreur: 'Aucun compte ne correspond à ce numéro', statut: 404, invitation: true };
      const participationExistante = await transaction.participation.findUnique({
        where: { utilisateurId_tontineId: { utilisateurId: utilisateur.id, tontineId: tontine.id } },
        select: { id: true },
      });
      if (participationExistante) return { erreur: 'Cette personne est déjà membre de la tontine', statut: 409 };
      await transaction.participation.create({ data: { utilisateurId: utilisateur.id, tontineId: tontine.id, roleCode: 'membre' } });
      return { succes: true };
    });
    if (resultat.erreur) return res.status(resultat.statut).json({ erreur: resultat.erreur, ...(resultat.invitation ? { invitation: true } : {}) });
    return res.status(201).json({ message: 'Membre ajouté avec succès' });
  } catch (err) {
    console.error('Erreur ajout membre :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de l’ajout du membre' });
  }
});

// Cette route renvoie le détail d'une tontine à ses participants.
router.get('/:id', async (req, res) => {
  try {
    // Le rôle vérifie que l'utilisateur participe à cette tontine.
    const roleCode = await verifierRole(req.utilisateurId, req.params.id);
    if (!roleCode) return res.status(403).json({ erreur: 'Vous ne participez pas à cette tontine' });
    // Prisma lit les informations de la tontine.
    const tontine = await db.tontine.findUnique({ where: { id: Number(req.params.id) } });
    if (!tontine) return res.status(404).json({ erreur: 'Tontine introuvable' });
    // La liste ne contient que les informations de membres utiles à l'écran.
    const participations = await db.participation.findMany({
      where: { tontineId: tontine.id },
      select: { roleCode: true, utilisateur: { select: { id: true, nom: true, photo: true } } },
      orderBy: { utilisateur: { nom: 'asc' } },
    });
    // La durée du cycle se calcule avec la fréquence et le nombre de membres prévus.
    const unitesDuree = { quotidien: 'jours', hebdomadaire: 'semaines', mensuel: 'mois' };
    // Les noms en français de l'API sont conservés pour l'application mobile.
    return res.json({
      tontine: {
        id: tontine.id,
        nom: tontine.nom,
        montant_cotisation: tontine.montantCotisation,
        frequence: tontine.frequence,
        nombre_membres: tontine.nombreMembres,
        regles: tontine.regles,
        statut: tontine.statut,
      },
      role_code: roleCode,
      membres: participations.map(({ utilisateur, roleCode: role }) => ({ utilisateur_id: utilisateur.id, nom: utilisateur.nom, photo: utilisateur.photo, role_code: role })),
      duree_cycle: { nombre: tontine.nombreMembres, unite: unitesDuree[tontine.frequence] },
    });
  } catch (err) {
    console.error('Erreur détail tontine :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture de la tontine' });
  }
});

// Cette route permet au gérant de retirer un membre avant le démarrage.
router.delete('/:id/membres/:utilisateurId', async (req, res) => {
  try {
    // Les identifiants reçus dans l'adresse doivent être des nombres entiers.
    const tontineId = Number(req.params.id);
    const utilisateurCible = Number(req.params.utilisateurId);
    if (!Number.isInteger(tontineId) || !Number.isInteger(utilisateurCible) || tontineId < 1 || utilisateurCible < 1) return res.status(400).json({ erreur: 'Identifiants invalides' });
    // Seul le gérant de cette tontine peut retirer une personne.
    const roleDemandeur = await verifierRole(req.utilisateurId, tontineId);
    if (roleDemandeur !== 'gerant') return res.status(403).json({ erreur: 'Réservé au gérant de la tontine' });
    if (utilisateurCible === req.utilisateurId) return res.status(400).json({ erreur: 'Le gérant ne peut pas se retirer de sa propre tontine' });
    // On interdit les retraits après le démarrage.
    const tontine = await db.tontine.findUnique({ where: { id: tontineId }, select: { statut: true } });
    if (!tontine) return res.status(404).json({ erreur: 'Tontine introuvable' });
    if (tontine.statut !== 'en_preparation') return res.status(400).json({ erreur: 'Impossible de retirer un membre une fois la tontine démarrée' });
    // On cherche la participation qui relie ce compte à cette tontine.
    const participation = await db.participation.findUnique({
      where: { utilisateurId_tontineId: { utilisateurId: utilisateurCible, tontineId } },
      select: { id: true },
    });
    if (!participation) return res.status(404).json({ erreur: 'Ce membre ne fait pas partie de la tontine' });
    // On vérifie les tables existantes sans les modifier.
    const [nombreCotisations, nombreTours] = await Promise.all([
      db.cotisation.count({ where: { participationId: participation.id } }),
      db.tour.count({ where: { beneficiaireId: participation.id } }),
    ]);
    if (nombreCotisations > 0 || nombreTours > 0) return res.status(409).json({ erreur: 'Ce membre a déjà des cotisations ou un tour : il ne peut pas être retiré' });
    // Seule la participation est supprimée, jamais le compte utilisateur.
    await db.participation.delete({ where: { id: participation.id } });
    return res.json({ message: 'Membre retiré' });
  } catch (err) {
    console.error('Erreur retrait membre :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Le routeur est utilisé sous /api/tontines par server.js.
module.exports = router;
