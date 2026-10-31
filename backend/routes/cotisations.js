// Express fournit le routeur : un petit groupe de routes rangé dans son propre fichier.
const express = require('express');
// path sert ici à lire l'extension du fichier de preuve.
const path = require('node:path');
// multer lit les fichiers envoyés dans un formulaire (multipart/form-data).
const multer = require('multer');
// db est le client Prisma, notre porte d'entrée vers MySQL.
const db = require('../db');
// Ce middleware vérifie le jeton de connexion et remplit req.utilisateurId.
const verifierToken = require('../middleware/verifierAuthentification');
// Cette fonction renvoie le rôle de la personne dans une tontine (null si elle n'y participe pas).
const { verifierRole } = require('../utils/roles');
// Fonctions de validation partagées.
const { lireIdentifiant, debutDeJournee } = require('../utils/validation');
// Gestion des fichiers de preuve (disque aujourd'hui, peut-être un service externe demain).
const { detecterType, enregistrerPreuve, lirePreuve, supprimerPreuve } = require('../utils/stockagePreuves');

const router = express.Router();
// Toutes les routes de ce fichier exigent d'être connecté.
router.use(verifierToken);

// Les statuts stockés d'une cotisation. Le retard n'en fait pas partie : il se calcule.
const statutsCotisation = ['non_paye', 'en_attente', 'paye', 'refuse'];
// Seules ces cotisations restent à payer : elles peuvent être "en retard" et être déclarées.
const statutsAPayer = ['non_paye', 'refuse'];
// Taille maximale d'une preuve : 5 Mo.
const taillePreuveMax = 5 * 1024 * 1024;

// Middleware : vérifie l'identifiant de la tontine et que l'appelant y participe.
// Il s'exécute AVANT la lecture du fichier : un inconnu ne peut pas nous faire recevoir 5 Mo pour rien.
async function exigerParticipant(req, res, next) {
  try {
    const tontineId = lireIdentifiant(req.params.id);
    if (!tontineId) return res.status(400).json({ erreur: 'Identifiant invalide' });
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    if (!roleCode) return res.status(403).json({ erreur: 'Vous ne participez pas à cette tontine' });
    // On garde les résultats dans req pour que la route n'ait pas à les recalculer.
    req.tontineId = tontineId;
    req.roleCode = roleCode;
    return next();
  } catch (err) {
    console.error('Erreur contrôle d’accès :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
}

// Lecteur de fichier : la preuve reste en mémoire le temps de la vérifier, rien n'est écrit sur le disque avant.
const lecteurPreuve = multer({ storage: multer.memoryStorage(), limits: { fileSize: taillePreuveMax, files: 1 } }).single('preuve');

// Middleware : lit le fichier "preuve" et traduit les erreurs de multer en réponses JSON claires.
function lirePreuveEnvoyee(req, res, next) {
  lecteurPreuve(req, res, (erreur) => {
    if (!erreur) return next();
    if (erreur.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ erreur: 'La preuve ne doit pas dépasser 5 Mo' });
    // Autre problème : mauvais nom de champ, plusieurs fichiers, requête mal formée.
    return res.status(400).json({ erreur: 'Envoi de la preuve invalide : un seul fichier, dans le champ "preuve"' });
  });
}

// Les champs lus en base pour une cotisation, partagés par toutes les routes de ce fichier.
const selectCotisation = {
  id: true, montant: true, dateEcheance: true, datePaiement: true, statut: true, preuveUrl: true, noteRefus: true,
  tour: { select: { numero: true, beneficiaire: { select: { utilisateur: { select: { id: true, nom: true } } } } } },
  participation: { select: { utilisateur: { select: { id: true, nom: true } } } },
};

// Transforme une cotisation de la base en réponse JSON (noms en snake_case, comme le reste de l'API).
function formaterCotisation(cotisation, aujourdhui) {
  // "slice(0, 10)" garde seulement AAAA-MM-JJ d'une date complète.
  const enTexte = (date) => (date ? date.toISOString().slice(0, 10) : null);
  return {
    cotisation_id: cotisation.id,
    tour_numero: cotisation.tour.numero,
    beneficiaire: cotisation.tour.beneficiaire
      ? { utilisateur_id: cotisation.tour.beneficiaire.utilisateur.id, nom: cotisation.tour.beneficiaire.utilisateur.nom }
      : null,
    membre: { utilisateur_id: cotisation.participation.utilisateur.id, nom: cotisation.participation.utilisateur.nom },
    montant: cotisation.montant,
    date_echeance: enTexte(cotisation.dateEcheance),
    date_paiement: enTexte(cotisation.datePaiement),
    statut: cotisation.statut,
    // Le retard est calculé à chaque lecture : il n'est jamais stocké, donc jamais périmé.
    en_retard: statutsAPayer.includes(cotisation.statut) && cotisation.dateEcheance < aujourdhui,
    // On dit seulement si une preuve existe : le nom du fichier n'est jamais exposé.
    preuve_disponible: Boolean(cotisation.preuveUrl),
    note_refus: cotisation.noteRefus,
  };
}

// GET /api/tontines/:id/cotisations : liste filtrable des cotisations.
// Filtres facultatifs : ?utilisateur_id=  ?statut=  ?en_retard=true|false
router.get('/:id/cotisations', exigerParticipant, async (req, res) => {
  try {
    // Filtre sur un membre précis, s'il est demandé.
    let utilisateurCible = null;
    if (req.query.utilisateur_id !== undefined) {
      utilisateurCible = lireIdentifiant(req.query.utilisateur_id);
      if (!utilisateurCible) return res.status(400).json({ erreur: 'Identifiant invalide' });
    }
    // Un simple membre ne voit que ses propres cotisations, quoi qu'il demande.
    if (req.roleCode !== 'gerant') {
      if (utilisateurCible && utilisateurCible !== req.utilisateurId) {
        return res.status(403).json({ erreur: 'Vous ne pouvez consulter que vos propres cotisations' });
      }
      utilisateurCible = req.utilisateurId;
    }

    // Filtre sur le statut stocké.
    const statutDemande = req.query.statut;
    if (statutDemande !== undefined && !statutsCotisation.includes(statutDemande)) {
      return res.status(400).json({ erreur: 'Statut invalide' });
    }
    // Filtre sur le retard : "true", "false" ou absent.
    const retardDemande = req.query.en_retard;
    if (retardDemande !== undefined && retardDemande !== 'true' && retardDemande !== 'false') {
      return res.status(400).json({ erreur: 'Le paramètre en_retard doit valoir true ou false' });
    }

    const aujourdhui = debutDeJournee();
    // Une cotisation est en retard si elle reste à payer et que son échéance est avant aujourd'hui.
    const conditionRetard = { statut: { in: statutsAPayer }, dateEcheance: { lt: aujourdhui } };

    // On assemble les conditions : elles doivent toutes être vraies (AND).
    const conditions = [{ participation: { tontineId: req.tontineId, ...(utilisateurCible ? { utilisateurId: utilisateurCible } : {}) } }];
    if (statutDemande) conditions.push({ statut: statutDemande });
    if (retardDemande === 'true') conditions.push(conditionRetard);
    // NOT : le contraire de la condition de retard.
    if (retardDemande === 'false') conditions.push({ NOT: conditionRetard });

    const cotisations = await db.cotisation.findMany({
      where: { AND: conditions },
      // On trie par échéance, puis par nom du membre, puis par identifiant pour un ordre stable.
      orderBy: [{ dateEcheance: 'asc' }, { participation: { utilisateur: { nom: 'asc' } } }, { id: 'asc' }],
      select: selectCotisation,
    });

    return res.json({
      tontine_id: req.tontineId,
      cotisations: cotisations.map((cotisation) => formaterCotisation(cotisation, aujourdhui)),
    });
  } catch (err) {
    console.error('Erreur lecture cotisations :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture des cotisations' });
  }
});

// POST /api/tontines/:id/cotisations/:cotisationId/declaration : "J'ai payé".
// Formulaire multipart avec un fichier facultatif dans le champ "preuve" (ou requête vide pour un paiement en main propre).
router.post('/:id/cotisations/:cotisationId/declaration', exigerParticipant, lirePreuveEnvoyee, async (req, res) => {
  // Nom du fichier enregistré par CETTE requête : il faut le supprimer si la suite échoue.
  let nomNouvellePreuve = null;
  try {
    const cotisationId = lireIdentifiant(req.params.cotisationId);
    if (!cotisationId) return res.status(400).json({ erreur: 'Identifiant invalide' });

    // On vérifie le vrai type du fichier AVANT d'écrire quoi que ce soit sur le disque.
    let typePreuve = null;
    if (req.file) {
      typePreuve = detecterType(req.file.buffer);
      if (!typePreuve) return res.status(400).json({ erreur: 'La preuve doit être une image JPEG, PNG ou WebP' });
    }

    // On cherche la cotisation DE L'APPELANT dans CETTE tontine.
    // Une cotisation inexistante, d'un autre membre ou d'une autre tontine donne la même réponse : on ne révèle rien.
    const cotisation = await db.cotisation.findFirst({
      where: { id: cotisationId, participation: { tontineId: req.tontineId, utilisateurId: req.utilisateurId } },
      select: { id: true, statut: true, preuveUrl: true, tour: { select: { tontine: { select: { statut: true } } } } },
    });
    if (!cotisation) return res.status(404).json({ erreur: 'Cotisation introuvable' });
    if (cotisation.tour.tontine.statut !== 'actif') return res.status(409).json({ erreur: 'La tontine n’est pas active' });
    if (!statutsAPayer.includes(cotisation.statut)) return res.status(409).json({ erreur: 'Cette cotisation est déjà déclarée ou validée' });

    // Tout est valide : on peut écrire le fichier.
    if (typePreuve) nomNouvellePreuve = await enregistrerPreuve(cotisation.id, req.file.buffer, typePreuve.extension);

    // La condition sur le statut est répétée DANS l'écriture : si deux clics arrivent en même temps,
    // un seul trouve encore la cotisation "à payer", l'autre modifie 0 ligne.
    const modifiees = await db.cotisation.updateMany({
      where: { id: cotisation.id, statut: { in: statutsAPayer } },
      data: {
        statut: 'en_attente',
        datePaiement: debutDeJournee(),
        // Une nouvelle déclaration remplace la précédente : ancien motif de refus et ancienne preuve disparaissent.
        noteRefus: null,
        valideePar: null,
        preuveUrl: nomNouvellePreuve,
      },
    });
    if (modifiees.count === 0) {
      // On a perdu la course : notre fichier ne sert plus à rien.
      await supprimerPreuve(nomNouvellePreuve);
      return res.status(409).json({ erreur: 'Cette cotisation est déjà déclarée ou validée' });
    }

    // La déclaration est enregistrée : l'ancienne preuve (cas d'un refus précédent) peut partir.
    await supprimerPreuve(cotisation.preuveUrl);

    const miseAJour = await db.cotisation.findUnique({ where: { id: cotisation.id }, select: selectCotisation });
    return res.json(formaterCotisation(miseAJour, debutDeJournee()));
  } catch (err) {
    // En cas de panne après l'écriture du fichier, on ne laisse pas de fichier orphelin.
    await supprimerPreuve(nomNouvellePreuve);
    console.error('Erreur déclaration paiement :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la déclaration du paiement' });
  }
});

// Type de contenu à annoncer au client, selon l'extension du fichier enregistré.
const typesContenu = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// GET /api/tontines/:id/cotisations/:cotisationId/preuve : renvoie l'image de la preuve.
// Accessible au propriétaire de la cotisation et au gérant de la tontine, à personne d'autre.
router.get('/:id/cotisations/:cotisationId/preuve', exigerParticipant, async (req, res) => {
  try {
    const cotisationId = lireIdentifiant(req.params.cotisationId);
    if (!cotisationId) return res.status(400).json({ erreur: 'Identifiant invalide' });

    // Le gérant voit toutes les preuves de sa tontine ; un membre, uniquement la sienne.
    const filtreProprietaire = req.roleCode === 'gerant' ? {} : { utilisateurId: req.utilisateurId };
    const cotisation = await db.cotisation.findFirst({
      where: { id: cotisationId, participation: { tontineId: req.tontineId, ...filtreProprietaire } },
      select: { preuveUrl: true },
    });
    // Cotisation inexistante, d'un autre membre, ou sans preuve : une seule réponse, on ne révèle rien.
    if (!cotisation || !cotisation.preuveUrl) return res.status(404).json({ erreur: 'Preuve introuvable' });

    let octets;
    try {
      octets = await lirePreuve(cotisation.preuveUrl);
    } catch (err) {
      // La base connaît la preuve mais le fichier a disparu du disque : on le dit clairement.
      if (err.code === 'ENOENT') return res.status(404).json({ erreur: 'Le fichier de la preuve n’est plus disponible' });
      throw err;
    }

    res.set({
      'Content-Type': typesContenu[path.extname(cotisation.preuveUrl).toLowerCase()] || 'application/octet-stream',
      // Interdit au navigateur de "deviner" un autre type que celui annoncé.
      'X-Content-Type-Options': 'nosniff',
      // Une preuve de paiement ne doit être gardée dans aucun cache.
      'Cache-Control': 'private, no-store',
    });
    return res.send(octets);
  } catch (err) {
    console.error('Erreur lecture preuve :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture de la preuve' });
  }
});

// POST /api/tontines/:id/cotisations/:cotisationId/validation : le gérant valide ou refuse une déclaration.
// Corps : { "decision": "valider" | "refuser", "note": "motif facultatif (refus seulement)" }
router.post('/:id/cotisations/:cotisationId/validation', exigerParticipant, async (req, res) => {
  try {
    // Seul le gérant décide (le contrôle de participation a déjà eu lieu dans exigerParticipant).
    if (req.roleCode !== 'gerant') return res.status(403).json({ erreur: 'Réservé au gérant de la tontine' });
    const cotisationId = lireIdentifiant(req.params.cotisationId);
    if (!cotisationId) return res.status(400).json({ erreur: 'Identifiant invalide' });

    // "?? {}" évite une erreur si la requête n'a pas de corps.
    const { decision, note } = req.body ?? {};
    if (decision !== 'valider' && decision !== 'refuser') {
      return res.status(400).json({ erreur: 'La décision doit être « valider » ou « refuser »' });
    }
    // Le motif est facultatif, réservé au refus, textuel, et limité à 500 caractères.
    let motif = null;
    if (note !== undefined && note !== null) {
      if (decision === 'valider' || typeof note !== 'string' || note.trim().length > 500) {
        return res.status(400).json({ erreur: 'Motif invalide' });
      }
      // Un motif vide ou fait d'espaces est traité comme "pas de motif".
      motif = note.trim() || null;
    }

    // La cotisation doit appartenir à CETTE tontine (peu importe quel membre la détient).
    const cotisation = await db.cotisation.findFirst({
      where: { id: cotisationId, participation: { tontineId: req.tontineId } },
      select: { id: true, statut: true, tour: { select: { tontine: { select: { statut: true } } } } },
    });
    if (!cotisation) return res.status(404).json({ erreur: 'Cotisation introuvable' });
    if (cotisation.tour.tontine.statut !== 'actif') return res.status(409).json({ erreur: 'La tontine n’est pas active' });
    if (cotisation.statut !== 'en_attente') return res.status(409).json({ erreur: 'Cette cotisation n’est pas en attente de validation' });

    // valideePar référence la PARTICIPATION du gérant (pas son compte) : on la lit.
    const participationGerant = await db.participation.findUnique({
      where: { utilisateurId_tontineId: { utilisateurId: req.utilisateurId, tontineId: req.tontineId } },
      select: { id: true },
    });

    // Valider : la cotisation est payée. Refuser : on garde le motif et on efface la date de paiement,
    // puisque le paiement n'est pas reconnu. La preuve est conservée dans les deux cas.
    const donnees = decision === 'valider'
      ? { statut: 'paye', valideePar: participationGerant.id }
      : { statut: 'refuse', noteRefus: motif, datePaiement: null, valideePar: participationGerant.id };

    // La condition sur le statut est répétée DANS l'écriture : si deux décisions arrivent en même temps,
    // une seule trouve encore la cotisation "en attente", l'autre modifie 0 ligne.
    const modifiees = await db.cotisation.updateMany({ where: { id: cotisation.id, statut: 'en_attente' }, data: donnees });
    if (modifiees.count === 0) return res.status(409).json({ erreur: 'Cette cotisation n’est pas en attente de validation' });

    const miseAJour = await db.cotisation.findUnique({ where: { id: cotisation.id }, select: selectCotisation });
    return res.json(formaterCotisation(miseAJour, debutDeJournee()));
  } catch (err) {
    console.error('Erreur décision sur un paiement :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la décision sur le paiement' });
  }
});

// Le routeur est branché sous /api/tontines par server.js.
module.exports = router;