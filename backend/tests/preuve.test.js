const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

// Premiers octets qui identifient vraiment chaque type d'image.
const entetesImage = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};
const octets = (type, taille = 64) => Buffer.concat([entetesImage[type], Buffer.alloc(taille, 7)]);
const formulaireAvec = (contenu, nom, mime) => {
  const formulaire = new FormData();
  formulaire.append('preuve', new Blob([contenu], { type: mime }), nom);
  return formulaire;
};

describe('Consulter une preuve de paiement', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;
  let tontineId;
  let idJpeg;
  let idPng;
  let idSansPreuve;
  const envoyeJpeg = octets('jpeg', 150);
  const envoyePng = octets('png', 90);

  const trouver = async (idTontine, utilisateurId, numero) => (await prisma.cotisation.findFirst({
    where: { tour: { tontineId: idTontine, numero }, participation: { utilisateurId } },
    select: { id: true },
  })).id;
  // On lit la réponse en octets (et non en JSON) puisque la route renvoie une image.
  const lire = async (idTontine, idCotisation, jeton) => {
    const reponse = await fetch(`${serveur.url}/api/tontines/${idTontine}/cotisations/${idCotisation}/preuve`, {
      headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
    });
    return { statut: reponse.status, entetes: reponse.headers, contenu: Buffer.from(await reponse.arrayBuffer()) };
  };
  // Pour les réponses d'erreur, le contenu est du JSON : on en extrait le message.
  const erreurDe = (resultat) => JSON.parse(resultat.contenu.toString()).erreur;

  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
    tontineId = await outils.creerTontineDemarree(serveur, awa, [moussa, fatou], dans(7));
    idJpeg = await trouver(tontineId, moussa.id, 1);
    idSansPreuve = await trouver(tontineId, moussa.id, 2);
    idPng = await trouver(tontineId, fatou.id, 1);
    // Trois déclarations réelles : une avec JPEG, une avec PNG, une sans photo (cash).
    const declarations = [
      [idJpeg, moussa, { formulaire: formulaireAvec(envoyeJpeg, 'a.jpg', 'image/jpeg') }],
      [idPng, fatou, { formulaire: formulaireAvec(envoyePng, 'a.png', 'image/png') }],
      [idSansPreuve, moussa, { corps: {} }],
    ];
    for (const [id, membre, options] of declarations) {
      const { statut } = await outils.appeler(serveur, 'POST', `/api/tontines/${tontineId}/cotisations/${id}/declaration`, { jeton: membre.jeton, ...options });
      assert.equal(statut, 200);
    }
  });

  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  it('refuse un appel sans jeton (401)', async () => {
    assert.equal((await lire(tontineId, idJpeg, undefined)).statut, 401);
  });

  it('refuse un identifiant invalide (400)', async () => {
    assert.equal((await lire(tontineId, 'abc', awa.jeton)).statut, 400);
  });

  it('refuse un non-participant (403)', async () => {
    assert.equal((await lire(tontineId, idJpeg, ibrahim.jeton)).statut, 403);
  });

  it('le propriétaire reçoit exactement l’image envoyée, avec les bons en-têtes', async () => {
    const resultat = await lire(tontineId, idJpeg, moussa.jeton);
    assert.equal(resultat.statut, 200);
    assert.deepEqual(resultat.contenu, envoyeJpeg);
    assert.equal(resultat.entetes.get('content-type'), 'image/jpeg');
    assert.equal(resultat.entetes.get('x-content-type-options'), 'nosniff');
    assert.match(resultat.entetes.get('cache-control'), /no-store/);
  });

  it('le gérant reçoit la preuve d’un membre, et le type suit le fichier (PNG)', async () => {
    const resultat = await lire(tontineId, idPng, awa.jeton);
    assert.equal(resultat.statut, 200);
    assert.deepEqual(resultat.contenu, envoyePng);
    assert.equal(resultat.entetes.get('content-type'), 'image/png');
  });

  it('un autre membre ne voit pas la preuve (404)', async () => {
    const resultat = await lire(tontineId, idJpeg, fatou.jeton);
    assert.equal(resultat.statut, 404);
    assert.equal(erreurDe(resultat), 'Preuve introuvable');
  });

  it('une cotisation sans preuve (cash) donne 404, au propriétaire comme au gérant', async () => {
    for (const jeton of [moussa.jeton, awa.jeton]) {
      const resultat = await lire(tontineId, idSansPreuve, jeton);
      assert.equal(resultat.statut, 404);
      assert.equal(erreurDe(resultat), 'Preuve introuvable');
    }
  });

  it('une cotisation inexistante donne 404', async () => {
    assert.equal((await lire(tontineId, 999999999, awa.jeton)).statut, 404);
  });

  it('le gérant ne peut pas lire une preuve d’une autre tontine, même avec son identifiant (404)', async () => {
    const autreTontine = await outils.creerTontineDemarree(serveur, awa, [ibrahim], dans(7));
    assert.equal((await lire(autreTontine, idJpeg, awa.jeton)).statut, 404);
  });

  it('si le fichier a disparu du disque, la réponse est un 404 explicite et non une erreur 500', async () => {
    const nom = (await prisma.cotisation.findUnique({ where: { id: idPng } })).preuveUrl;
    await fs.rm(path.join(serveur.dossierPreuves, nom));
    for (const jeton of [fatou.jeton, awa.jeton]) {
      const resultat = await lire(tontineId, idPng, jeton);
      assert.equal(resultat.statut, 404);
      assert.match(erreurDe(resultat), /plus disponible/);
    }
  });

  it('un nom de fichier piégé comme "../../.env" ne permet jamais de sortir du dossier des preuves', async () => {
    await prisma.cotisation.update({ where: { id: idSansPreuve }, data: { preuveUrl: '../../.env' } });
    const resultat = await lire(tontineId, idSansPreuve, awa.jeton);
    assert.equal(resultat.statut, 404);
    assert.ok(!resultat.contenu.toString().includes('JWT_SECRET'));
  });
});