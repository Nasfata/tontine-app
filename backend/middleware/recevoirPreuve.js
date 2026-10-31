// Ce middleware lit la photo de preuve d'un paiement et traduit les erreurs d'envoi en réponses JSON claires.
const multer = require('multer');

// Taille maximale d'une preuve : 5 Mo.
const taillePreuveMax = 5 * 1024 * 1024;
// La preuve reste en mémoire le temps de la vérifier : rien n'est écrit sur le disque avant.
const lecteurPreuve = multer({ storage: multer.memoryStorage(), limits: { fileSize: taillePreuveMax, files: 1 } }).single('preuve');

// Cette fonction lit le fichier du champ "preuve" avant que le contrôleur ne reçoive la requête.
function recevoirPreuve(req, res, next) {
  lecteurPreuve(req, res, (erreur) => {
    if (!erreur) return next();
    if (erreur.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ erreur: 'La preuve ne doit pas dépasser 5 Mo' });
    // Autre problème : mauvais nom de champ, plusieurs fichiers, requête mal formée.
    return res.status(400).json({ erreur: 'Envoi de la preuve invalide : un seul fichier, dans le champ "preuve"' });
  });
}

// Le routeur des cotisations place ce middleware avant le contrôleur de déclaration.
module.exports = recevoirPreuve;