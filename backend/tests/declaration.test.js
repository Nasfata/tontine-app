const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

// Les premiers octets qui identifient vraiment chaque type d'image.
const entetes = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]),
};
// Fabrique un faux fichier : le bon début, puis du remplissage.
const octets = (type, taille = 64) => Buffer.concat([entetes[type], Buffer.alloc(taille, 7)]);
// Fabrique un formulaire contenant un fichier dans le champ demandé.
const formulaireAvec = (contenu, { champ = 'preuve', nom = 'capture.jpg', mime = 'image/jpeg' } = {}) => {
  const formulaire = new FormData();
  formulaire.append(champ, new Blob([contenu], { type: mime }), nom);
  return formulaire;
};

describe('Module 3.2 : déclarer un paiement', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;
  let tontineId;

  // Raccourcis : déclarer, retrouver une cotisation, lister les fichiers présents sur le disque.
  const declarer = (idTontine, idCotisation, jeton, options = {}) =>
    outils.appeler(serveur, 'POST', `/api/tontines/${idTontine}/cotisations/${idCotisation}/declaration`, { jeton, ...options });
  const trouver = async (idTontine, utilisateurId, numero) => (await prisma.cotisation.findFirst({
    where: { tour: { tontineId: idTontine, numero }, participation: { utilisateurId } },
    select: { id: true },
  })).id;
  const fichiers = () => fs.readdir(serveur.dossierPreuves);
  const enBase = (id) => prisma.cotisation.findUnique({ where: { id } });
  const existe = (nom) => fs.access(path.join(serveur.dossierPreuves, nom)).then(() => true, () => false);

  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
    // Awa gérante, Moussa et Fatou membres : 9 cotisations.
    tontineId = await outils.creerTontineDemarree(serveur, awa, [moussa, fatou], dans(7));
  });

  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  describe('Refus', () => {
    it('refuse un appel sans jeton (401)', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      assert.equal((await declarer(tontineId, id, undefined)).statut, 401);
    });

    it('refuse un identifiant de cotisation invalide (400)', async () => {
      assert.equal((await declarer(tontineId, 'abc', moussa.jeton, { corps: {} })).statut, 400);
    });

    it('refuse un non-participant (403)', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      assert.equal((await declarer(tontineId, id, ibrahim.jeton, { corps: {} })).statut, 403);
    });

    it('répond 404 pour une cotisation inexistante', async () => {
      assert.equal((await declarer(tontineId, 999999999, moussa.jeton, { corps: {} })).statut, 404);
    });

    it('répond 404 pour la cotisation d’un autre membre, sans la modifier', async () => {
      const celleDeFatou = await trouver(tontineId, fatou.id, 1);
      const { statut } = await declarer(tontineId, celleDeFatou, moussa.jeton, { corps: {} });
      assert.equal(statut, 404);
      assert.equal((await enBase(celleDeFatou)).statut, 'non_paye');
    });

    it('le gérant ne peut pas déclarer à la place d’un membre (404)', async () => {
      const celleDeMoussa = await trouver(tontineId, moussa.id, 3);
      const { statut } = await declarer(tontineId, celleDeMoussa, awa.jeton, { corps: {} });
      assert.equal(statut, 404);
      assert.equal((await enBase(celleDeMoussa)).statut, 'non_paye');
    });

    it('répond 404 pour une cotisation qui appartient à une autre tontine', async () => {
      const autreTontine = await outils.creerTontineDemarree(serveur, awa, [ibrahim], dans(7));
      const celleDAwaAilleurs = await trouver(autreTontine, awa.id, 1);
      // Moussa utilise l'identifiant d'une cotisation d'une AUTRE tontine dans l'adresse de la sienne.
      assert.equal((await declarer(tontineId, celleDAwaAilleurs, moussa.jeton, { corps: {} })).statut, 404);
    });

    it('refuse si la tontine n’est pas active (409)', async () => {
      const gerant = await outils.creerCompte(serveur, 'Gerant termine');
      const membre = await outils.creerCompte(serveur, 'Membre termine');
      const idTerminee = await outils.creerTontineDemarree(serveur, gerant, [membre], dans(7));
      await prisma.tontine.update({ where: { id: idTerminee }, data: { statut: 'termine' } });
      const id = await trouver(idTerminee, membre.id, 1);
      const { statut, donnees } = await declarer(idTerminee, id, membre.jeton, { corps: {} });
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /pas active/);
    });

    it('refuse un fichier qui n’est pas une vraie image, même s’il se prétend JPEG (400)', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const faux = formulaireAvec(Buffer.from('ceci est du texte, pas une image'), { nom: 'faux.jpg', mime: 'image/jpeg' });
      const { statut, donnees } = await declarer(tontineId, id, moussa.jeton, { formulaire: faux });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /JPEG, PNG ou WebP/);
    });

    it('refuse un GIF (400)', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const gif = formulaireAvec(Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]), { nom: 'anim.gif', mime: 'image/gif' });
      assert.equal((await declarer(tontineId, id, moussa.jeton, { formulaire: gif })).statut, 400);
    });

    it('refuse un fichier de plus de 5 Mo (400)', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const gros = formulaireAvec(octets('jpeg', 5 * 1024 * 1024 + 1));
      const { statut, donnees } = await declarer(tontineId, id, moussa.jeton, { formulaire: gros });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /5 Mo/);
    });

    it('refuse un fichier envoyé dans un mauvais champ (400)', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const mauvaisChamp = formulaireAvec(octets('jpeg'), { champ: 'photo' });
      assert.equal((await declarer(tontineId, id, moussa.jeton, { formulaire: mauvaisChamp })).statut, 400);
    });

    it('les refus n’ont rien modifié : cotisation intacte et aucun fichier sur le disque', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const cotisation = await enBase(id);
      assert.equal(cotisation.statut, 'non_paye');
      assert.equal(cotisation.preuveUrl, null);
      assert.deepEqual(await fichiers(), []);
    });
  });

  describe('Déclarations réussies', () => {
    it('avec une photo JPEG : en attente, date du jour, fichier enregistré tel quel', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const envoye = octets('jpeg', 200);
      const { statut, donnees } = await declarer(tontineId, id, moussa.jeton, { formulaire: formulaireAvec(envoye) });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'en_attente');
      assert.equal(donnees.date_paiement, dans(0));
      assert.equal(donnees.preuve_disponible, true);
      assert.equal(donnees.en_retard, false);
      assert.equal(donnees.note_refus, null);
      // Le nom du fichier est fabriqué par le serveur et n'apparaît jamais dans la réponse.
      const nom = (await enBase(id)).preuveUrl;
      assert.match(nom, /^cot-\d+-\d+\.jpg$/);
      assert.ok(!JSON.stringify(donnees).includes(nom));
      assert.deepEqual(await fs.readFile(path.join(serveur.dossierPreuves, nom)), envoye);
    });

    it('sans photo (paiement en main propre) : en attente, sans preuve', async () => {
      const id = await trouver(tontineId, moussa.id, 2);
      const { statut, donnees } = await declarer(tontineId, id, moussa.jeton, { corps: {} });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'en_attente');
      assert.equal(donnees.preuve_disponible, false);
    });

    it('accepte le PNG et le WebP', async () => {
      const png = await declarer(tontineId, await trouver(tontineId, fatou.id, 1), fatou.jeton, { formulaire: formulaireAvec(octets('png'), { nom: 'a.png', mime: 'image/png' }) });
      const webp = await declarer(tontineId, await trouver(tontineId, fatou.id, 2), fatou.jeton, { formulaire: formulaireAvec(octets('webp'), { nom: 'a.webp', mime: 'image/webp' }) });
      assert.equal(png.statut, 200);
      assert.equal(webp.statut, 200);
      assert.match((await enBase(await trouver(tontineId, fatou.id, 1))).preuveUrl, /\.png$/);
      assert.match((await enBase(await trouver(tontineId, fatou.id, 2))).preuveUrl, /\.webp$/);
    });

    it('le gérant déclare sa propre cotisation', async () => {
      const id = await trouver(tontineId, awa.id, 1);
      const { statut, donnees } = await declarer(tontineId, id, awa.jeton, { corps: {} });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'en_attente');
    });

    it('la déclaration apparaît dans la liste du membre', async () => {
      const { donnees } = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/cotisations?statut=en_attente`, { jeton: moussa.jeton });
      assert.equal(donnees.cotisations.length, 2);
    });
  });

  describe('Cotisations qu’on ne peut pas redéclarer', () => {
    it('refuse une cotisation déjà en attente (409), sans nouveau fichier', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const avant = await fichiers();
      const { statut, donnees } = await declarer(tontineId, id, moussa.jeton, { formulaire: formulaireAvec(octets('jpeg')) });
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /déjà déclarée/);
      assert.deepEqual(await fichiers(), avant);
    });

    it('refuse une cotisation déjà validée (409)', async () => {
      const id = await trouver(tontineId, fatou.id, 3);
      await prisma.cotisation.update({ where: { id }, data: { statut: 'paye' } });
      assert.equal((await declarer(tontineId, id, fatou.jeton, { corps: {} })).statut, 409);
    });
  });

  describe('Redéclaration après un refus', () => {
    it('une nouvelle photo remplace l’ancienne, et le motif du refus disparaît', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const ancienNom = (await enBase(id)).preuveUrl;
      await prisma.cotisation.update({ where: { id }, data: { statut: 'refuse', noteRefus: 'photo floue' } });
      const { statut, donnees } = await declarer(tontineId, id, moussa.jeton, { formulaire: formulaireAvec(octets('png'), { nom: 'nette.png', mime: 'image/png' }) });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'en_attente');
      assert.equal(donnees.note_refus, null);
      const cotisation = await enBase(id);
      assert.match(cotisation.preuveUrl, /\.png$/);
      assert.equal(await existe(cotisation.preuveUrl), true);
      assert.equal(await existe(ancienNom), false);
    });

    it('redéclarer sans photo supprime l’ancienne preuve', async () => {
      const id = await trouver(tontineId, fatou.id, 1);
      const ancienNom = (await enBase(id)).preuveUrl;
      assert.equal(await existe(ancienNom), true);
      await prisma.cotisation.update({ where: { id }, data: { statut: 'refuse', noteRefus: 'montant incorrect' } });
      const { statut, donnees } = await declarer(tontineId, id, fatou.jeton, { corps: {} });
      assert.equal(statut, 200);
      assert.equal(donnees.preuve_disponible, false);
      assert.equal((await enBase(id)).preuveUrl, null);
      assert.equal(await existe(ancienNom), false);
    });
  });

  describe('Deux clics simultanés', () => {
    it('une seule déclaration est acceptée et un seul fichier est conservé', async () => {
      const id = await trouver(tontineId, awa.id, 2);
      const avant = (await fichiers()).length;
      const [premiere, seconde] = await Promise.all([
        declarer(tontineId, id, awa.jeton, { formulaire: formulaireAvec(octets('jpeg', 100)) }),
        declarer(tontineId, id, awa.jeton, { formulaire: formulaireAvec(octets('jpeg', 101)) }),
      ]);
      assert.deepEqual([premiere.statut, seconde.statut].sort(), [200, 409]);
      assert.equal((await fichiers()).length, avant + 1);
    });
  });
});