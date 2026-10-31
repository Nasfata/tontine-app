const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

// Un faux JPEG : le bon début, puis du remplissage.
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(80, 7)]);
const formulaireJpeg = () => {
  const formulaire = new FormData();
  formulaire.append('preuve', new Blob([jpeg], { type: 'image/jpeg' }), 'capture.jpg');
  return formulaire;
};

describe('Module 3.3 : valider ou refuser un paiement', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;
  let tontineId;
  let attenteAwa2;

  // Raccourcis.
  const trouver = async (idTontine, utilisateurId, numero) => (await prisma.cotisation.findFirst({
    where: { tour: { tontineId: idTontine, numero }, participation: { utilisateurId } },
    select: { id: true },
  })).id;
  const enBase = (id) => prisma.cotisation.findUnique({ where: { id } });
  // Met directement une cotisation "en attente" (sans passer par l'API de déclaration).
  const mettreEnAttente = (id) => prisma.cotisation.update({
    where: { id },
    data: { statut: 'en_attente', datePaiement: new Date(`${dans(0)}T00:00:00.000Z`) },
  });
  const decider = (idCotisation, jeton, corps, idTontine = tontineId) =>
    outils.appeler(serveur, 'POST', `/api/tontines/${idTontine}/cotisations/${idCotisation}/validation`, { jeton, corps });
  const declarer = (idCotisation, membre, options = {}) =>
    outils.appeler(serveur, 'POST', `/api/tontines/${tontineId}/cotisations/${idCotisation}/declaration`, { jeton: membre.jeton, ...options });

  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
    // Awa gérante, Moussa et Fatou membres : 9 cotisations.
    tontineId = await outils.creerTontineDemarree(serveur, awa, [moussa, fatou], dans(7));
    // Une cotisation "en attente" qui doit rester intacte pendant tous les tests de refus.
    attenteAwa2 = await trouver(tontineId, awa.id, 2);
    await mettreEnAttente(attenteAwa2);
  });

  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  describe('Accès', () => {
    it('refuse un appel sans jeton (401)', async () => {
      assert.equal((await decider(attenteAwa2, undefined, { decision: 'valider' })).statut, 401);
    });

    it('refuse un identifiant de cotisation invalide (400)', async () => {
      assert.equal((await decider('abc', awa.jeton, { decision: 'valider' })).statut, 400);
    });

    it('refuse un non-participant (403)', async () => {
      assert.equal((await decider(attenteAwa2, ibrahim.jeton, { decision: 'valider' })).statut, 403);
    });

    it('refuse un simple membre (403) et ne modifie rien', async () => {
      const { statut, donnees } = await decider(attenteAwa2, moussa.jeton, { decision: 'valider' });
      assert.equal(statut, 403);
      assert.match(donnees.erreur, /gérant/);
      assert.equal((await enBase(attenteAwa2)).statut, 'en_attente');
    });
  });

  describe('Corps de la requête', () => {
    it('refuse une décision absente ou inconnue (400)', async () => {
      for (const corps of [{}, { decision: 'accepter' }, { decision: '' }, { decision: 42 }]) {
        const { statut, donnees } = await decider(attenteAwa2, awa.jeton, corps);
        assert.equal(statut, 400, JSON.stringify(corps));
        assert.match(donnees.erreur, /valider.*refuser/);
      }
    });

    it('refuse un motif avec "valider" (400)', async () => {
      const { statut, donnees } = await decider(attenteAwa2, awa.jeton, { decision: 'valider', note: 'bravo' });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /Motif invalide/);
    });

    it('refuse un motif non textuel ou de plus de 500 caractères (400)', async () => {
      for (const note of [123, ['a'], 'a'.repeat(501)]) {
        const { statut } = await decider(attenteAwa2, awa.jeton, { decision: 'refuser', note });
        assert.equal(statut, 400);
      }
    });

    it('les refus n’ont rien modifié : la cotisation est toujours en attente, sans motif', async () => {
      const cotisation = await enBase(attenteAwa2);
      assert.equal(cotisation.statut, 'en_attente');
      assert.equal(cotisation.noteRefus, null);
      assert.equal(cotisation.valideePar, null);
    });
  });

  describe('Cotisations qu’on ne peut pas décider', () => {
    it('répond 404 pour une cotisation inexistante', async () => {
      assert.equal((await decider(999999999, awa.jeton, { decision: 'valider' })).statut, 404);
    });

    it('répond 404 pour une cotisation d’une autre tontine', async () => {
      const autreTontine = await outils.creerTontineDemarree(serveur, awa, [ibrahim], dans(7));
      const celleDIbrahimAilleurs = await trouver(autreTontine, ibrahim.id, 1);
      await mettreEnAttente(celleDIbrahimAilleurs);
      // Awa est gérante des deux tontines, mais l'identifiant ne correspond pas à la tontine de l'adresse.
      assert.equal((await decider(celleDIbrahimAilleurs, awa.jeton, { decision: 'valider' })).statut, 404);
      assert.equal((await enBase(celleDIbrahimAilleurs)).statut, 'en_attente');
    });

    it('refuse une cotisation qui n’est pas en attente : non payée, payée ou refusée (409)', async () => {
      const id = await trouver(tontineId, awa.id, 3);
      for (const statutInitial of ['non_paye', 'paye', 'refuse']) {
        await prisma.cotisation.update({ where: { id }, data: { statut: statutInitial } });
        const { statut, donnees } = await decider(id, awa.jeton, { decision: 'valider' });
        assert.equal(statut, 409, statutInitial);
        assert.match(donnees.erreur, /pas en attente/);
        assert.equal((await enBase(id)).statut, statutInitial);
      }
    });

    it('refuse si la tontine n’est pas active (409)', async () => {
      const gerant = await outils.creerCompte(serveur, 'Gerant termine');
      const membre = await outils.creerCompte(serveur, 'Membre termine');
      const idTerminee = await outils.creerTontineDemarree(serveur, gerant, [membre], dans(7));
      const id = await trouver(idTerminee, membre.id, 1);
      await mettreEnAttente(id);
      await prisma.tontine.update({ where: { id: idTerminee }, data: { statut: 'termine' } });
      const { statut, donnees } = await decider(id, gerant.jeton, { decision: 'valider' }, idTerminee);
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /pas active/);
    });
  });

  describe('Décisions réussies', () => {
    it('valider : statut payé, décideur enregistré, preuve conservée et toujours lisible', async () => {
      const id = await trouver(tontineId, moussa.id, 1);
      const declaration = await declarer(id, moussa, { formulaire: formulaireJpeg() });
      assert.equal(declaration.statut, 200);
      const { statut, donnees } = await decider(id, awa.jeton, { decision: 'valider' });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'paye');
      assert.equal(donnees.en_retard, false);
      assert.equal(donnees.preuve_disponible, true);
      assert.equal(donnees.note_refus, null);
      assert.equal(donnees.date_paiement, dans(0));
      // valideePar contient la PARTICIPATION d'Awa dans cette tontine.
      const participationAwa = await prisma.participation.findUnique({
        where: { utilisateurId_tontineId: { utilisateurId: awa.id, tontineId } },
        select: { id: true },
      });
      assert.equal((await enBase(id)).valideePar, participationAwa.id);
      // La preuve reste lisible par le membre après la validation.
      const lecture = await fetch(`${serveur.url}/api/tontines/${tontineId}/cotisations/${id}/preuve`, { headers: { Authorization: `Bearer ${moussa.jeton}` } });
      assert.equal(lecture.status, 200);
    });

    it('refuser avec motif : statut refusé, motif nettoyé, date de paiement effacée, visible du membre', async () => {
      const id = await trouver(tontineId, fatou.id, 1);
      await mettreEnAttente(id);
      const { statut, donnees } = await decider(id, awa.jeton, { decision: 'refuser', note: '  montant incorrect  ' });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'refuse');
      assert.equal(donnees.note_refus, 'montant incorrect');
      assert.equal(donnees.date_paiement, null);
      // Le membre voit son refus et son motif dans sa propre liste.
      const liste = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/cotisations?statut=refuse`, { jeton: fatou.jeton });
      const refusee = liste.donnees.cotisations.find((cotisation) => cotisation.cotisation_id === id);
      assert.equal(refusee.note_refus, 'montant incorrect');
    });

    it('refuser sans motif : accepté, motif vide', async () => {
      const id = await trouver(tontineId, fatou.id, 2);
      await mettreEnAttente(id);
      const { statut, donnees } = await decider(id, awa.jeton, { decision: 'refuser' });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'refuse');
      assert.equal(donnees.note_refus, null);
    });

    it('un motif de exactement 500 caractères est accepté', async () => {
      const id = await trouver(tontineId, fatou.id, 3);
      await mettreEnAttente(id);
      const { statut, donnees } = await decider(id, awa.jeton, { decision: 'refuser', note: 'a'.repeat(500) });
      assert.equal(statut, 200);
      assert.equal(donnees.note_refus.length, 500);
    });

    it('le gérant peut valider sa propre déclaration', async () => {
      const id = await trouver(tontineId, awa.id, 1);
      await mettreEnAttente(id);
      const { statut, donnees } = await decider(id, awa.jeton, { decision: 'valider' });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'paye');
    });

    it('parcours complet : déclarer, refuser, redéclarer, valider, puis plus rien à faire', async () => {
      const id = await trouver(tontineId, moussa.id, 2);
      assert.equal((await declarer(id, moussa, { corps: {} })).donnees.statut, 'en_attente');
      assert.equal((await decider(id, awa.jeton, { decision: 'refuser', note: 'photo floue' })).donnees.statut, 'refuse');
      // Le membre recotise : le motif du refus disparaît.
      const redeclaration = await declarer(id, moussa, { formulaire: formulaireJpeg() });
      assert.equal(redeclaration.donnees.statut, 'en_attente');
      assert.equal(redeclaration.donnees.note_refus, null);
      assert.equal((await decider(id, awa.jeton, { decision: 'valider' })).donnees.statut, 'paye');
      // Une cotisation validée ne peut plus être ni redécidée ni redéclarée.
      assert.equal((await decider(id, awa.jeton, { decision: 'refuser' })).statut, 409);
      assert.equal((await declarer(id, moussa, { corps: {} })).statut, 409);
    });
  });

  describe('Deux décisions simultanées', () => {
    it('une seule est acceptée et le résultat final correspond à celle-ci', async () => {
      const id = await trouver(tontineId, moussa.id, 3);
      await mettreEnAttente(id);
      const [validation, refus] = await Promise.all([
        decider(id, awa.jeton, { decision: 'valider' }),
        decider(id, awa.jeton, { decision: 'refuser', note: 'trop tard' }),
      ]);
      assert.deepEqual([validation.statut, refus.statut].sort(), [200, 409]);
      const gagnante = validation.statut === 200 ? 'paye' : 'refuse';
      assert.equal((await enBase(id)).statut, gagnante);
    });
  });
});