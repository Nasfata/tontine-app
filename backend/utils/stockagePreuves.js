// Stockage des preuves de paiement.
// Toute la gestion des fichiers est ici : si l'équipe choisit un stockage externe plus tard
// (Cloudinary, disque persistant Render...), seul ce fichier changera, pas les routes.
const fs = require('node:fs/promises');
const path = require('node:path');

// Dossier des preuves : volontairement HORS de "uploads", qui est public.
// La variable PREUVES_DOSSIER permet de le changer (les tests s'en servent).
function dossierPreuves() {
  return process.env.PREUVES_DOSSIER || path.join(__dirname, '..', 'preuves');
}

// Reconnaît le vrai type d'une image grâce à ses premiers octets.
// Le type annoncé par le client (mimetype, extension) peut mentir : les premiers octets, non.
function detecterType(octets) {
  // JPEG : commence par FF D8 FF.
  if (octets.length >= 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) return { extension: '.jpg' };
  // PNG : signature fixe de 8 octets.
  const signaturePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (octets.length >= 8 && octets.subarray(0, 8).equals(signaturePng)) return { extension: '.png' };
  // WebP : "RIFF", puis 4 octets de taille, puis "WEBP".
  if (octets.length >= 12 && octets.subarray(0, 4).toString('ascii') === 'RIFF' && octets.subarray(8, 12).toString('ascii') === 'WEBP') return { extension: '.webp' };
  // Tout le reste (GIF, PDF, texte...) est refusé.
  return null;
}

// Écrit la preuve sur le disque et renvoie son nom. Le nom est fabriqué par le serveur, jamais par le client.
async function enregistrerPreuve(cotisationId, octets, extension) {
  await fs.mkdir(dossierPreuves(), { recursive: true });
  const nom = `cot-${cotisationId}-${Date.now()}${extension}`;
  // Le drapeau "wx" refuse d'écraser un fichier existant.
  await fs.writeFile(path.join(dossierPreuves(), nom), octets, { flag: 'wx' });
  return nom;
}

// Lit une preuve. path.basename garde seulement le nom : impossible de sortir du dossier avec "../".
async function lirePreuve(nom) {
  return fs.readFile(path.join(dossierPreuves(), path.basename(nom)));
}

// Supprime une preuve sans jamais faire échouer la requête (un fichier déjà absent n'est pas une erreur).
async function supprimerPreuve(nom) {
  if (!nom) return;
  try {
    await fs.unlink(path.join(dossierPreuves(), path.basename(nom)));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Suppression de preuve impossible :', err.message);
  }
}

module.exports = { detecterType, enregistrerPreuve, lirePreuve, supprimerPreuve };