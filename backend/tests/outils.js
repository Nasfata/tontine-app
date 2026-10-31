// Outils partagés par tous les fichiers de tests du backend.
// Charge le fichier .env (quiet : sans message dans le terminal).
require('dotenv').config({ quiet: true });

// spawn lance un autre programme (ici, notre serveur) dans un processus séparé.
const { spawn } = require('node:child_process');
// net sert à trouver un port réseau libre.
const net = require('node:net');
// path construit des chemins de dossiers.
const path = require('node:path');
// fs gère les fichiers et os donne le dossier temporaire du système.
const fs = require('node:fs/promises');
const os = require('node:os');
// randomInt fabrique des nombres aléatoires pour les numéros de téléphone.
const { randomInt } = require('node:crypto');
// Client Prisma, utilisé ici pour modifier directement la base de test.
const { PrismaClient } = require('@prisma/client');

// Adresse de la base de test, lue dans backend/.env.
const urlTest = process.env.DATABASE_URL_TEST;

// Sécurité : refuse de tourner si la base visée n'est pas clairement une base de test.
function verifierBaseDeTest() {
  if (!urlTest) throw new Error('DATABASE_URL_TEST est absent de backend/.env');
  if (urlTest === process.env.DATABASE_URL) throw new Error('DATABASE_URL_TEST ne doit pas être la base de développement');
  // Le nom de la base est la fin de l'adresse : ".../tontine_test".
  const nomBase = new URL(urlTest).pathname.slice(1);
  if (!nomBase.toLowerCase().includes('test')) throw new Error('Le nom de la base de test doit contenir "test"');
}

// Demande au système un port libre, puis le libère pour que le serveur l'utilise.
function trouverPortLibre() {
  return new Promise((resolve, reject) => {
    const serveurTemporaire = net.createServer();
    serveurTemporaire.on('error', reject);
    // Le port 0 signifie : "donne-moi n'importe quel port libre".
    serveurTemporaire.listen(0, () => {
      const { port } = serveurTemporaire.address();
      serveurTemporaire.close(() => resolve(port));
    });
  });
}

// Démarre server.js sur la base de test et attend qu'il soit prêt.
async function demarrerServeur() {
  verifierBaseDeTest();
  const port = await trouverPortLibre();
  // Dossier temporaire pour les preuves de ce serveur de test.
  const dossierPreuves = await fs.mkdtemp(path.join(os.tmpdir(), 'tontine-preuves-'));
  // On lance "node server.js" dans le dossier backend, avec notre port, notre base et notre dossier de preuves.
  const processus = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DATABASE_URL: urlTest, PREUVES_DOSSIER: dossierPreuves },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // On garde tout ce que le serveur écrit, pour l'afficher s'il plante.
  let sortie = '';
  await new Promise((resolve, reject) => {
    const delai = setTimeout(() => reject(new Error(`Le serveur ne démarre pas :\n${sortie}`)), 15000);
    processus.stdout.on('data', (morceau) => {
      sortie += morceau;
      // Le serveur écrit "Serveur démarré ..." quand il est prêt.
      if (sortie.includes('Serveur démarré')) { clearTimeout(delai); resolve(); }
    });
    processus.stderr.on('data', (morceau) => { sortie += morceau; });
    processus.on('exit', (code) => { clearTimeout(delai); reject(new Error(`Le serveur s'est arrêté (code ${code}) :\n${sortie}`)); });
  });
  // On renvoie l'adresse, le dossier des preuves et une fonction pour tout arrêter et nettoyer.
  return {
    url: `http://127.0.0.1:${port}`,
    dossierPreuves,
    arreter: () => {
      processus.kill();
      fs.rm(dossierPreuves, { recursive: true, force: true }).catch(() => {});
    },
  };
}

// Envoie une requête HTTP et renvoie { statut, donnees } (même pour les erreurs).
// "corps" est envoyé en JSON ; "formulaire" (un FormData) est envoyé en multipart, pour les fichiers.
async function appeler(serveur, methode, chemin, { jeton, corps, formulaire } = {}) {
  // Avec un formulaire, fetch fabrique lui-même l'en-tête multipart (avec sa "frontière") : on n'y touche pas.
  const entetes = formulaire ? {} : { 'Content-Type': 'application/json' };
  if (jeton) entetes.Authorization = `Bearer ${jeton}`;
  const reponse = await fetch(`${serveur.url}${chemin}`, {
    method: methode,
    headers: entetes,
    body: formulaire ?? (corps === undefined ? undefined : JSON.stringify(corps)),
  });
  // Si la réponse n'est pas du JSON, on renvoie un objet vide.
  const donnees = await reponse.json().catch(() => ({}));
  return { statut: reponse.status, donnees };
}

// Inscrit un compte de test avec un numéro aléatoire et renvoie ses informations.
async function creerCompte(serveur, nom) {
  const telephone = `77${randomInt(10000000, 100000000)}`;
  const { statut, donnees } = await appeler(serveur, 'POST', '/api/auth/inscription', {
    corps: { nom, telephone, motDePasse: 'secret123' },
  });
  if (statut !== 201) throw new Error(`Inscription de ${nom} impossible (${statut}) : ${JSON.stringify(donnees)}`);
  return { id: donnees.utilisateur.id, jeton: donnees.token, telephone, nom };
}

// Crée une tontine dont "gerant" est le créateur, et renvoie son identifiant.
async function creerTontine(serveur, gerant, nombreMembres = 3, frequence = 'mensuel') {
  const { statut, donnees } = await appeler(serveur, 'POST', '/api/tontines', {
    jeton: gerant.jeton,
    corps: { nom: 'Tontine de test', montant_cotisation: 5000, frequence, nombre_membres: nombreMembres },
  });
  if (statut !== 201) throw new Error(`Création de tontine impossible (${statut}) : ${JSON.stringify(donnees)}`);
  return donnees.id;
}

// Le gérant ajoute un compte existant à la tontine.
async function ajouterMembre(serveur, gerant, tontineId, membre) {
  const { statut, donnees } = await appeler(serveur, 'POST', `/api/tontines/${tontineId}/membres`, {
    jeton: gerant.jeton,
    corps: { telephone: membre.telephone },
  });
  if (statut !== 201) throw new Error(`Ajout de ${membre.nom} impossible (${statut}) : ${JSON.stringify(donnees)}`);
}

// Ouvre un client Prisma branché sur la base de test (pour préparer des cas particuliers).
function ouvrirPrisma() {
  verifierBaseDeTest();
  return new PrismaClient({ datasourceUrl: urlTest });
}

// Crée une tontine déjà démarrée : gérant + membres, ordre défini (gérant en premier), puis démarrage.
async function creerTontineDemarree(serveur, gerant, membres, dateDebut, frequence = 'mensuel') {
  const idTontine = await creerTontine(serveur, gerant, membres.length + 1, frequence);
  for (const membre of membres) await ajouterMembre(serveur, gerant, idTontine, membre);
  const ordre = [gerant.id, ...membres.map((membre) => membre.id)];
  const definition = await appeler(serveur, 'PUT', `/api/tontines/${idTontine}/ordre`, { jeton: gerant.jeton, corps: { ordre } });
  if (definition.statut !== 200) throw new Error(`Définition de l'ordre impossible (${definition.statut}) : ${JSON.stringify(definition.donnees)}`);
  const demarrage = await appeler(serveur, 'POST', `/api/tontines/${idTontine}/demarrer`, { jeton: gerant.jeton, corps: { date_debut: dateDebut } });
  if (demarrage.statut !== 201) throw new Error(`Démarrage impossible (${demarrage.statut}) : ${JSON.stringify(demarrage.donnees)}`);
  return idTontine;
}

module.exports = { demarrerServeur, appeler, creerCompte, creerTontine, ajouterMembre, creerTontineDemarree, ouvrirPrisma };