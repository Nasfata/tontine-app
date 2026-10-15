// Express sert à créer les routes de tontines.
const express = require('express');
// Le pool partagé fournit des connexions MySQL et des transactions.
const db = require('../db');
// Ce middleware vérifie le JWT et renseigne l'identifiant utilisateur.
const verifierToken = require('../middleware/auth');
// Cette fonction vérifie le rôle d'un utilisateur dans une tontine.
const { verifierRole } = require('../utils/roles');
// Cette fonction normalise les numéros reçus du formulaire d'ajout.
const { normaliserTelephone } = require('../utils/telephone');

// Le routeur regroupe les routes liées aux tontines.
const router = express.Router();
// Toutes les routes de ce fichier exigent une session valide.
router.use(verifierToken);

// Cette route crée une tontine et l'inscription du gérant dans une transaction.
router.post('/', async (req, res) => {
  // On récupère les valeurs fournies dans le JSON de la requête.
  const { nom, montant_cotisation, frequence, nombre_membres, regles } = req.body;
  // Le montant est converti en nombre pour valider les valeurs numériques.
  const montant = Number(montant_cotisation);
  // Les fréquences sont limitées aux trois valeurs métier autorisées.
  const frequencesAutorisees = ['quotidien', 'hebdomadaire', 'mensuel'];
  // Un nom doit être fourni et contenir au moins un caractère non blanc.
  if (typeof nom !== 'string' || !nom.trim()) {
    return res.status(400).json({ erreur: 'Le nom de la tontine est obligatoire' });
  }
  // Le montant doit être un nombre strictement positif.
  if (!Number.isFinite(montant) || montant <= 0) {
    return res.status(400).json({ erreur: 'Le montant de cotisation doit être supérieur à zéro' });
  }
  // La fréquence doit appartenir à la liste métier.
  if (!frequencesAutorisees.includes(frequence)) {
    return res.status(400).json({ erreur: 'La fréquence doit être quotidien, hebdomadaire ou mensuel' });
  }
  // Le nombre de membres doit être un entier supérieur ou égal à deux.
  if (!Number.isInteger(nombre_membres) || nombre_membres < 2) {
    return res.status(400).json({ erreur: 'Le nombre de membres doit être un entier supérieur ou égal à 2' });
  }
  // La connexion est gardée pour exécuter les deux insertions dans une seule transaction.
  let connexion;
  // Ce drapeau indique si une transaction doit être annulée en cas d'erreur.
  let transactionDemarree = false;
  try {
    // Une connexion dédiée garantit que les requêtes partagent la même transaction.
    connexion = await db.getConnection();
    // La transaction commence avant les écritures en base de données.
    await connexion.beginTransaction();
    transactionDemarree = true;
    // On insère la tontine dans son état initial de préparation.
    const [resultatTontine] = await connexion.query(
      "INSERT INTO Tontine (nom, montant_cotisation, frequence, nombre_membres, regles, statut) VALUES (?, ?, ?, ?, ?, 'en_preparation')",
      [nom.trim(), montant, frequence, nombre_membres, regles ?? null]
    );
    // L'identifiant créé lie la première participation à la tontine.
    const tontineId = resultatTontine.insertId;
    // Le créateur est immédiatement inscrit avec le rôle de gérant.
    await connexion.query(
      "INSERT INTO Participation (utilisateur_id, tontine_id, role_code) VALUES (?, ?, 'gerant')",
      [req.utilisateurId, tontineId]
    );
    // Les deux écritures sont validées ensemble.
    await connexion.commit();
    transactionDemarree = false;
    // Le client reçoit la ressource créée et son identifiant.
    return res.status(201).json({ message: 'Tontine créée', id: tontineId, statut: 'en_preparation' });
  } catch (err) {
    // Une erreur annule les écritures déjà effectuées dans la transaction.
    if (connexion && transactionDemarree) await connexion.rollback();
    // L'erreur détaillée reste dans les journaux du serveur.
    console.error('Erreur création tontine :', err.message);
    // Le client reçoit une erreur JSON sans détail interne de la base.
    return res.status(500).json({ erreur: 'Erreur serveur lors de la création de la tontine' });
  } finally {
    // La connexion est toujours rendue au pool, même si une requête échoue.
    if (connexion) connexion.release();
  }
});

// Cette route liste les tontines auxquelles la personne connectée participe.
router.get('/', async (req, res) => {
  try {
    // La jointure récupère le rôle par tontine et son libellé.
    const [tontines] = await db.query(
      `SELECT t.id, t.nom, t.montant_cotisation, t.frequence, t.nombre_membres, t.regles, t.statut,
              p.role_code, r.libelle AS libelle_role,
              (SELECT COUNT(*) FROM Participation AS p2 WHERE p2.tontine_id = t.id) AS nombre_membres_inscrits
       FROM Tontine AS t
       INNER JOIN Participation AS p ON p.tontine_id = t.id
       LEFT JOIN Role AS r ON r.code = p.role_code
       WHERE p.utilisateur_id = ?
       ORDER BY t.id DESC`,
      [req.utilisateurId]
    );
    // Seules les tontines liées à l'utilisateur courant sont renvoyées.
    return res.json(tontines);
  } catch (err) {
    // L'erreur détaillée aide au diagnostic côté serveur.
    console.error('Erreur liste tontines :', err.message);
    // Le client reçoit un message générique au format JSON.
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture des tontines' });
  }
});

// Cette route permet au gérant d'ajouter un utilisateur déjà inscrit par téléphone.
router.post('/:id/membres', async (req, res) => {
  // Le numéro est lu puis normalisé avant toute recherche en base.
  const telephone = normaliserTelephone(req.body?.telephone);
  // On garde la connexion pour vérifier le quota et inscrire le membre dans une transaction.
  let connexion;
  // Ce drapeau indique si les requêtes doivent encore être annulées.
  let transactionDemarree = false;
  try {
    // Le rôle est vérifié avant toute autre information sur les utilisateurs.
    const roleCode = await verifierRole(req.utilisateurId, req.params.id);
    // Un utilisateur absent ou non-gérant ne peut pas ajouter de membre.
    if (roleCode !== 'gerant') return res.status(403).json({ erreur: 'Seul le gérant peut ajouter un membre' });
    // Un numéro vide ne peut pas désigner un compte à ajouter.
    if (!telephone) return res.status(400).json({ erreur: 'Un numéro de téléphone est requis' });
    // Une connexion dédiée permet de verrouiller la tontine pendant l'ajout.
    connexion = await db.getConnection();
    // La transaction empêche plusieurs ajouts simultanés de dépasser la capacité.
    await connexion.beginTransaction();
    transactionDemarree = true;
    // Le verrou de ligne sérialise les contrôles de capacité pour cette tontine.
    const [lignesTontine] = await connexion.query(
      'SELECT id, nombre_membres FROM Tontine WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    // Une tontine absente ne peut pas recevoir de membre.
    if (lignesTontine.length === 0) {
      await connexion.rollback();
      transactionDemarree = false;
      return res.status(404).json({ erreur: 'Tontine introuvable' });
    }
    // On compte les participations déjà enregistrées pour cette tontine.
    const [lignesNombre] = await connexion.query(
      'SELECT COUNT(*) AS nombre FROM Participation WHERE tontine_id = ?',
      [req.params.id]
    );
    // Le quota maximal défini à la création est respecté.
    if (Number(lignesNombre[0].nombre) >= Number(lignesTontine[0].nombre_membres)) {
      await connexion.rollback();
      transactionDemarree = false;
      return res.status(400).json({ erreur: 'La tontine a déjà atteint son nombre maximal de membres' });
    }
    // La recherche porte uniquement sur le numéro fourni, jamais sur une liste d'utilisateurs.
    const [utilisateurs] = await connexion.query(
      'SELECT id FROM Utilisateur WHERE telephone = ?',
      [telephone]
    );
    // Aucun compte ne correspond : l'invitation sera gérée dans une version ultérieure.
    if (utilisateurs.length === 0) {
      await connexion.rollback();
      transactionDemarree = false;
      return res.status(404).json({ erreur: 'Aucun compte ne correspond à ce numéro', invitation: true });
    }
    // On évite de créer une seconde participation pour le même compte.
    const [participationsExistantes] = await connexion.query(
      'SELECT utilisateur_id FROM Participation WHERE tontine_id = ? AND utilisateur_id = ?',
      [req.params.id, utilisateurs[0].id]
    );
    // Un membre déjà inscrit reçoit un conflit au lieu d'une insertion dupliquée.
    if (participationsExistantes.length > 0) {
      await connexion.rollback();
      transactionDemarree = false;
      return res.status(409).json({ erreur: 'Cette personne est déjà membre de la tontine' });
    }
    // Le nouveau participant reçoit le rôle de membre dans cette tontine seulement.
    await connexion.query(
      "INSERT INTO Participation (utilisateur_id, tontine_id, role_code) VALUES (?, ?, 'membre')",
      [utilisateurs[0].id, req.params.id]
    );
    // L'inscription devient visible seulement après validation de la transaction.
    await connexion.commit();
    transactionDemarree = false;
    // Le gérant reçoit une confirmation sans données sensibles supplémentaires.
    return res.status(201).json({ message: 'Membre ajouté avec succès' });
  } catch (err) {
    // Une erreur annule l'inscription incomplète si une transaction est active.
    if (connexion && transactionDemarree) {
      try {
        // Le rollback garde la base cohérente après une erreur SQL.
        await connexion.rollback();
      } catch (erreurRollback) {
        // L'échec éventuel du rollback est consigné sans masquer l'erreur initiale.
        console.error('Erreur annulation ajout membre :', erreurRollback.message);
      }
    }
    // L'erreur SQL détaillée reste dans les journaux du serveur.
    console.error('Erreur ajout membre :', err.message);
    // Le client reçoit un message JSON générique.
    return res.status(500).json({ erreur: 'Erreur serveur lors de l’ajout du membre' });
  } finally {
    // La connexion est rendue au pool quel que soit le résultat.
    if (connexion) connexion.release();
  }
});

// Cette route renvoie le détail d'une tontine accessible à son participant.
router.get('/:id', async (req, res) => {
  try {
    // On vérifie l'appartenance avant de lire les informations de la tontine.
    const roleCode = await verifierRole(req.utilisateurId, req.params.id);
    // Un compte sans participation n'a pas le droit de consulter cette tontine.
    if (!roleCode) return res.status(403).json({ erreur: 'Vous ne participez pas à cette tontine' });
    // La tontine est récupérée avec les champs utiles à son détail.
    const [lignesTontine] = await db.query(
      'SELECT id, nom, montant_cotisation, frequence, nombre_membres, regles, statut FROM Tontine WHERE id = ?',
      [req.params.id]
    );
    // Cette protection gère une participation orpheline si la base est incohérente.
    if (lignesTontine.length === 0) return res.status(404).json({ erreur: 'Tontine introuvable' });
    // Les membres sont limités aux informations demandées sans téléphone.
    const [membres] = await db.query(
      `SELECT u.id AS utilisateur_id, u.nom, u.photo, p.role_code
       FROM Participation AS p
       INNER JOIN Utilisateur AS u ON u.id = p.utilisateur_id
       WHERE p.tontine_id = ?
       ORDER BY u.nom`,
      [req.params.id]
    );
    // La durée est exprimée dans l'unité correspondant à la fréquence.
    const unitesDuree = { quotidien: 'jours', hebdomadaire: 'semaines', mensuel: 'mois' };
    // On ajoute le rôle et la durée calculée sans modifier la donnée enregistrée.
    return res.json({
      tontine: lignesTontine[0],
      role_code: roleCode,
      membres,
      duree_cycle: { nombre: lignesTontine[0].nombre_membres, unite: unitesDuree[lignesTontine[0].frequence] },
    });
  } catch (err) {
    // L'erreur détaillée est réservée aux journaux du backend.
    console.error('Erreur détail tontine :', err.message);
    // Le client reçoit une erreur JSON cohérente avec les autres routes.
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture de la tontine' });
  }
});

// Le routeur est monté sous /api/tontines par server.js.
module.exports = router;
