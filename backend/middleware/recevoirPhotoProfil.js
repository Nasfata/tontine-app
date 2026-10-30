// Ce middleware configure la réception et le filtrage des photos de profil.
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dossierUploads = path.join(__dirname, '..', 'uploads');

// Le dossier de destination existe avant la réception du premier fichier.
fs.mkdirSync(dossierUploads, { recursive: true });

// Multer conserve le nom et la taille maximale utilisés jusqu'ici.
const stockage = multer.diskStorage({
  destination: (req, fichier, terminer) => terminer(null, dossierUploads),
  filename: (req, fichier, terminer) => terminer(null, `profil-${req.utilisateurId}-${Date.now()}${path.extname(fichier.originalname).toLowerCase()}`),
});
const receptionPhoto = multer({
  storage: stockage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, fichier, terminer) => fichier.mimetype.startsWith('image/')
    ? terminer(null, true)
    : terminer(new Error('Seules les images sont acceptées')),
});

// Cette fonction reçoit un seul fichier envoyé sous le champ « photo ».
module.exports = receptionPhoto.single('photo');
