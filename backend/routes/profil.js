const express = require('express');
// path : outil Node pour manipuler les chemins de fichiers
const path = require('path');
// fs : outil Node pour lire/créer des dossiers et fichiers
const fs = require('fs');
// multer : reçoit les fichiers envoyés
const multer = require('multer');

const db = require('../db');
// Notre middleware qui vérifie que l'utilisateur est connecté
const verifierToken = require('../middleware/auth');
// Cette fonction renvoie partout les numéros sous un format cohérent.
const { normaliserTelephone } = require('../utils/telephone');

const router = express.Router();

// ---------- Configuration de l'upload de photo ----------

// Dossier où les photos seront rangées : backend/uploads
const dossierUploads = path.join(__dirname, '..', 'uploads');

// Crée le dossier s'il n'existe pas encore
// recursive: true = ne plante pas s'il existe déjà
fs.mkdirSync(dossierUploads, { recursive: true });

// "storage" dit à multer où ranger le fichier et quel nom lui donner
const storage = multer.diskStorage({
  // Où ranger : dans le dossier uploads
  destination: (req, file, cb) => cb(null, dossierUploads),

  // Quel nom : "profil-<id>-<date>.<extension>"
  // Ça évite que deux photos aient le même nom
  filename: (req, file, cb) => {
    // path.extname récupère l'extension du fichier original (.jpg, .png...)
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `profil-${req.utilisateurId}-${Date.now()}${extension}`);
  },
});

// "upload" = l'outil prêt à l'emploi
const upload = multer({
  storage,
  // Limite la taille à 5 Mo
  limits: { fileSize: 5 * 1024 * 1024 },
  // Filtre : on n'accepte que les images
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);   // accepté
    } else {
      cb(new Error('Seules les images sont acceptées'));  // refusé
    }
  },
});

// Toutes les routes de ce fichier exigent d'être connecté
router.use(verifierToken);

// ======================================================================
// VOIR MON PROFIL  →  GET /api/profil
// ======================================================================
router.get('/', async (req, res) => {
  try {
    // req.utilisateurId a été rempli par le middleware verifierToken
    const [lignes] = await db.query(
      'SELECT id, nom, telephone, photo, date_creation FROM Utilisateur WHERE id = ?',
      [req.utilisateurId]
    );

    // Si aucune ligne : l'utilisateur n'existe plus
    if (lignes.length === 0) {
      // 404 = introuvable
      return res.status(404).json({ erreur: 'Utilisateur introuvable' });
    }

    // lignes[0] = l'utilisateur (sans le hash du mot de passe)
    // Le numéro renvoyé suit le même format que celui enregistré par les routes.
    res.json({ ...lignes[0], telephone: normaliserTelephone(lignes[0].telephone) });
  } catch (err) {
    console.error('Erreur lecture profil :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ======================================================================
// MODIFIER MON PROFIL  →  PUT /api/profil
// ======================================================================
router.put('/', async (req, res) => {
  try {
    const { nom, telephone: telephoneSaisi } = req.body;
    // Le numéro est normalisé avant la vérification de doublon et la mise à jour.
    const telephone = normaliserTelephone(telephoneSaisi);

    // Les deux champs sont obligatoires
    if (!nom || !telephone) {
      return res.status(400).json({ erreur: 'Nom et téléphone requis' });
    }

    // Vérifie que le numéro n'appartient pas à UN AUTRE utilisateur.
    // "id <> ?" veut dire "id différent de"
    const [doublon] = await db.query(
      'SELECT id FROM Utilisateur WHERE telephone = ? AND id <> ?',
      [telephone, req.utilisateurId]
    );

    if (doublon.length > 0) {
      return res.status(409).json({ erreur: 'Ce numéro est déjà utilisé' });
    }

    // Met à jour la ligne de l'utilisateur connecté
    await db.query(
      'UPDATE Utilisateur SET nom = ?, telephone = ? WHERE id = ?',
      [nom, telephone, req.utilisateurId]
    );

    // Le cahier demande que les changements soient visibles partout :
    // c'est automatique, car les autres tables pointent vers l'id
    // de l'utilisateur et ne copient pas son nom.
    res.json({ message: 'Profil mis à jour', nom, telephone });
  } catch (err) {
    console.error('Erreur modification profil :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ======================================================================
// CHANGER MA PHOTO  →  POST /api/profil/photo
// ======================================================================
// upload.single('photo') : attend UN fichier envoyé sous le nom de champ "photo"
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    // Si aucun fichier n'a été reçu
    if (!req.file) {
      return res.status(400).json({ erreur: 'Aucune photo reçue' });
    }

    // Chemin public de la photo, ex : /uploads/profil-1-1700000000.jpg
    const cheminPhoto = `/uploads/${req.file.filename}`;

    // Enregistre ce chemin dans la colonne "photo"
    await db.query(
      'UPDATE Utilisateur SET photo = ? WHERE id = ?',
      [cheminPhoto, req.utilisateurId]
    );

    res.json({ message: 'Photo mise à jour', photo: cheminPhoto });
  } catch (err) {
    console.error('Erreur upload photo :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Gestion des erreurs de multer (fichier trop gros, pas une image...)
// Un middleware à 4 paramètres (err, req, res, next) = gestionnaire d'erreurs
router.use((err, req, res, next) => {
  res.status(400).json({ erreur: err.message });
});

module.exports = router;
