const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

describe('Module 4.3 : remise de la cagnotte', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;
  let tontineId;

  // Raccourcis : chemin, retrouver une cotisation, la déclarer, la valider, payer plusieurs cotisations, remettre.
  const chemin = (idTontine, fin) => `/api/tontines/${idTontine}/${fin}`;
  const trouver = async (idTontine, utilisateurId, numero) => (await prisma.cotisation.findFirst({
    where: { tour: { tontineId: idTontine, numero }, participation: { utilisateurId } },
    select: { id: true },
  })).id;
  const declarer = async (idTontine, compte, numero) => {
    const id = await trouver(idTontine, compte.id, numero);
    const { statut } = await outils.appeler(serveur, 'POST', chemin(idTontine, `cotisations/${id}/declaration`), { jeton: compte.jeton, corps: {} });
    assert.equal(statut, 200);
  };
  const valider = async (idTontine, gerant, compte, numero) => {
    const id = await trouver(idTontine, compte.id, numero);
    const { statut } = await outils.appeler(serveur, 'POST', chemin(idTontine, `cotisations/${id}/validation`), { jeton: gerant.jeton, corps: { decision: 'valider' } });
    assert.equal(statut, 200);
  };
  // Chaque compte déclare sa cotisation du tour, puis le gérant la valide.
  const payer = async (idTontine, gerant, comptes, numero) => {
    for (const compte of comptes) {
      await declarer(idTontine, compte, numero);
      await valider(idTontine, gerant, compte, numero);
    }
  };
  const remettre = (idTontine, numero, jeton) => outils.appeler(serveur, 'POST', chemin(idTontine, `tours/${numero}/remise`), { jeton });
  const calendrier = (idTontine, jeton) => outils.appeler(serveur, 'GET', chemin(idTontine, 'tours'), { jeton });

  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
    // Awa gérante, ordre : Awa (tour 1), Moussa (tour 2), Fatou (tour 3).
    tontineId = await outils.creerTontineDemarree(serveur, awa, [moussa, fatou], dans(7));
  });

  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  describe('Refus', () => {
    it('refuse un appel sans jeton (401)', async () => {
      assert.equal((await remettre(tontineId, 1, undefined)).statut, 401);
    });

    it('refuse un identifiant de tontine invalide (400)', async () => {
      assert.equal((await remettre('abc', 1, awa.jeton)).statut, 400);
    });

    it('refuse un numéro de tour invalide (400)', async () => {
      for (const numero of ['abc', 0, -1]) {
        assert.equal((await remettre(tontineId, numero, awa.jeton)).statut, 400, `numéro = ${numero}`);
      }
    });

    it('refuse un simple membre (403)', async () => {
      assert.equal((await remettre(tontineId, 1, moussa.jeton)).statut, 403);
    });

    it('refuse un non-participant (403)', async () => {
      assert.equal((await remettre(tontineId, 1, ibrahim.jeton)).statut, 403);
    });

    it('répond 404 pour un tour qui n’existe pas', async () => {
      assert.equal((await remettre(tontineId, 9, awa.jeton)).statut, 404);
    });

    it('refuse un tour qui n’est pas le tour en cours (409)', async () => {
      const { statut, donnees } = await remettre(tontineId, 2, awa.jeton);
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /pas le tour en cours/);
    });

    it('refuse tant qu’aucune cotisation n’est payée (409)', async () => {
      const { statut, donnees } = await remettre(tontineId, 1, awa.jeton);
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /3 cotisation/);
    });

    it('une cotisation seulement déclarée, pas validée, bloque aussi la remise (409)', async () => {
      await payer(tontineId, awa, [awa, moussa], 1);
      await declarer(tontineId, fatou, 1);
      const { statut, donnees } = await remettre(tontineId, 1, awa.jeton);
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /1 cotisation/);
    });

    it('refuse si la tontine n’est pas active (409)', async () => {
      const gerant = await outils.creerCompte(serveur, 'Gerant termine');
      const membre = await outils.creerCompte(serveur, 'Membre termine');
      const idTerminee = await outils.creerTontineDemarree(serveur, gerant, [membre], dans(7));
      await prisma.tontine.update({ where: { id: idTerminee }, data: { statut: 'termine' } });
      const { statut, donnees } = await remettre(idTerminee, 1, gerant.jeton);
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /pas active/);
    });

    it('les refus n’ont rien modifié : le tour 1 est toujours en cours et sans date de remise', async () => {
      const { donnees } = await calendrier(tontineId, awa.jeton);
      assert.equal(donnees.statut, 'actif');
      assert.deepEqual(donnees.tours.map((tour) => tour.statut), ['en_cours', 'a_venir', 'a_venir']);
      assert.ok(donnees.tours.every((tour) => tour.date_remise === null));
    });
  });

  describe('Remise réussie', () => {
    it('le gérant enregistre la remise du tour 1 : le tour 2 devient le tour en cours (200)', async () => {
      await valider(tontineId, awa, fatou, 1);
      const { statut, donnees } = await remettre(tontineId, 1, awa.jeton);
      assert.equal(statut, 200);
      assert.equal(donnees.message, 'Remise enregistrée');
      assert.equal(donnees.statut, 'actif');
      assert.equal(donnees.tour_en_cours, 2);
      assert.deepEqual(donnees.tours.map((tour) => tour.statut), ['complete', 'en_cours', 'a_venir']);
      assert.equal(donnees.tours[0].date_remise, dans(0));
      assert.equal(donnees.tours[1].date_remise, null);
    });

    it('un membre voit le même calendrier', async () => {
      const { donnees } = await calendrier(tontineId, moussa.jeton);
      assert.equal(donnees.tour_en_cours, 2);
      assert.deepEqual(donnees.tours.map((tour) => tour.statut), ['complete', 'en_cours', 'a_venir']);
    });

    it('rejouer la remise du tour 1 est refusé (409) et ne change rien', async () => {
      const { statut, donnees } = await remettre(tontineId, 1, awa.jeton);
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /pas le tour en cours/);
      const apres = await calendrier(tontineId, awa.jeton);
      assert.deepEqual(apres.donnees.tours.map((tour) => tour.statut), ['complete', 'en_cours', 'a_venir']);
    });

    it('le bénéficiaire doit lui aussi avoir payé : sans la cotisation de Moussa, le tour 2 reste bloqué (409)', async () => {
      await payer(tontineId, awa, [awa, fatou], 2);
      const { statut, donnees } = await remettre(tontineId, 2, awa.jeton);
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /1 cotisation/);
    });
  });

  describe('Dernier tour', () => {
    it('la remise du tour 2 fait passer le tour 3 en cours', async () => {
      await payer(tontineId, awa, [moussa], 2);
      const { statut, donnees } = await remettre(tontineId, 2, awa.jeton);
      assert.equal(statut, 200);
      assert.equal(donnees.tour_en_cours, 3);
      assert.deepEqual(donnees.tours.map((tour) => tour.statut), ['complete', 'complete', 'en_cours']);
      assert.equal(donnees.statut, 'actif');
    });

    it('la remise du dernier tour termine la tontine : plus aucun tour en cours', async () => {
      await payer(tontineId, awa, [awa, moussa, fatou], 3);
      const { statut, donnees } = await remettre(tontineId, 3, awa.jeton);
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'termine');
      assert.equal(donnees.tour_en_cours, null);
      assert.deepEqual(donnees.tours.map((tour) => tour.statut), ['complete', 'complete', 'complete']);
      assert.ok(donnees.tours.every((tour) => tour.date_remise === dans(0)));
      assert.equal((await prisma.tontine.findUnique({ where: { id: tontineId } })).statut, 'termine');
    });

    it('une fois la tontine terminée, plus aucune remise n’est possible (409)', async () => {
      assert.equal((await remettre(tontineId, 3, awa.jeton)).statut, 409);
    });
  });

  describe('Deux clics simultanés', () => {
    it('une seule remise est acceptée et le tour n’avance qu’une fois', async () => {
      const gerant = await outils.creerCompte(serveur, 'Gerant double clic');
      const membre = await outils.creerCompte(serveur, 'Membre double clic');
      const idTontine = await outils.creerTontineDemarree(serveur, gerant, [membre], dans(7));
      await payer(idTontine, gerant, [gerant, membre], 1);
      const [premiere, seconde] = await Promise.all([remettre(idTontine, 1, gerant.jeton), remettre(idTontine, 1, gerant.jeton)]);
      assert.deepEqual([premiere.statut, seconde.statut].sort(), [200, 409]);
      const { donnees } = await calendrier(idTontine, gerant.jeton);
      assert.deepEqual(donnees.tours.map((tour) => tour.statut), ['complete', 'en_cours']);
      assert.equal(donnees.tour_en_cours, 2);
    });
  });
});