const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

describe('Module 4.2 : démarrage et calendrier des tours', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;
  let tontineId;
  const dateDebut = dans(7);
  const chemin = (id, fin) => `/api/tontines/${id}/${fin}`;

  // Avant les tests : serveur, comptes, et une tontine de 3 membres SANS ordre défini.
  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
    tontineId = await outils.creerTontine(serveur, awa, 3);
    await outils.ajouterMembre(serveur, awa, tontineId, moussa);
    await outils.ajouterMembre(serveur, awa, tontineId, fatou);
  });

  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  describe('Consultation du calendrier avant démarrage', () => {
    it('refuse un appel sans jeton (401)', async () => {
      const { statut } = await outils.appeler(serveur, 'GET', chemin(tontineId, 'tours'));
      assert.equal(statut, 401);
    });

    it('refuse un identifiant invalide (400)', async () => {
      const { statut } = await outils.appeler(serveur, 'GET', '/api/tontines/abc/tours', { jeton: awa.jeton });
      assert.equal(statut, 400);
    });

    it('refuse un non-participant (403)', async () => {
      const { statut } = await outils.appeler(serveur, 'GET', chemin(tontineId, 'tours'), { jeton: ibrahim.jeton });
      assert.equal(statut, 403);
    });

    it('avant démarrage : aucun tour et aucun tour en cours', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'GET', chemin(tontineId, 'tours'), { jeton: moussa.jeton });
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'en_preparation');
      assert.deepEqual(donnees.tours, []);
      assert.equal(donnees.tour_en_cours, null);
    });
  });

  describe('Refus de démarrage', () => {
    it('refuse sans jeton (401)', async () => {
      const { statut } = await outils.appeler(serveur, 'POST', chemin(tontineId, 'demarrer'), { corps: { date_debut: dateDebut } });
      assert.equal(statut, 401);
    });

    it('refuse un simple membre (403)', async () => {
      const { statut } = await outils.appeler(serveur, 'POST', chemin(tontineId, 'demarrer'), { jeton: moussa.jeton, corps: { date_debut: dateDebut } });
      assert.equal(statut, 403);
    });

    it('refuse un non-participant (403)', async () => {
      const { statut } = await outils.appeler(serveur, 'POST', chemin(tontineId, 'demarrer'), { jeton: ibrahim.jeton, corps: { date_debut: dateDebut } });
      assert.equal(statut, 403);
    });

    it('refuse si tous les membres prévus ne sont pas inscrits (400)', async () => {
      const gerant = await outils.creerCompte(serveur, 'Gerant seul');
      const idIncomplet = await outils.creerTontine(serveur, gerant, 3);
      const { statut, donnees } = await outils.appeler(serveur, 'POST', chemin(idIncomplet, 'demarrer'), { jeton: gerant.jeton, corps: { date_debut: dateDebut } });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /Tous les membres/);
    });

    it('refuse si l’ordre de passage n’est pas défini (400)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'POST', chemin(tontineId, 'demarrer'), { jeton: awa.jeton, corps: { date_debut: dateDebut } });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /ordre de passage/);
    });

    it('refuse une date absente, impossible ou passée (400)', async () => {
      // On définit d'abord l'ordre pour que seule la date puisse faire échouer la requête.
      const ordre = await outils.appeler(serveur, 'PUT', chemin(tontineId, 'ordre'), { jeton: awa.jeton, corps: { ordre: [awa.id, fatou.id, moussa.id] } });
      assert.equal(ordre.statut, 200);
      for (const date of [undefined, '', '30/11/2031', '2031-02-30', '2020-01-01']) {
        const { statut } = await outils.appeler(serveur, 'POST', chemin(tontineId, 'demarrer'), { jeton: awa.jeton, corps: { date_debut: date } });
        assert.equal(statut, 400, `date_debut = ${JSON.stringify(date)}`);
      }
    });

    it('les refus n’ont rien créé : tontine toujours en préparation, aucun tour, aucune cotisation', async () => {
      const { donnees } = await outils.appeler(serveur, 'GET', chemin(tontineId, 'tours'), { jeton: awa.jeton });
      assert.equal(donnees.statut, 'en_preparation');
      assert.deepEqual(donnees.tours, []);
      assert.equal(await prisma.cotisation.count({ where: { tour: { tontineId } } }), 0);
    });
  });

  describe('Démarrage réussi', () => {
    it('le gérant démarre : tontine active, 3 tours dans l’ordre de passage (201)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'POST', chemin(tontineId, 'demarrer'), { jeton: awa.jeton, corps: { date_debut: dateDebut } });
      assert.equal(statut, 201);
      assert.equal(donnees.statut, 'actif');
      assert.equal(donnees.date_debut, dateDebut);
      assert.equal(donnees.tour_en_cours, 1);
      assert.deepEqual(donnees.tours.map((tour) => tour.numero), [1, 2, 3]);
      assert.deepEqual(donnees.tours.map((tour) => tour.beneficiaire.utilisateur_id), [awa.id, fatou.id, moussa.id]);
      assert.deepEqual(donnees.tours.map((tour) => tour.statut), ['en_cours', 'a_venir', 'a_venir']);
      // 3 membres x 5000 FCFA = 15000 FCFA attendus (le montant est renvoyé sous forme de texte).
      assert.ok(donnees.tours.every((tour) => Number(tour.montant_cagnotte) === 15000));
      assert.equal(donnees.tours[0].date_prevue, dateDebut);
      assert.ok(donnees.tours.every((tour) => tour.date_remise === null));
    });

    it('crée 9 cotisations : 3 par tour, une par membre, toutes non payées à 5000', async () => {
      const cotisations = await prisma.cotisation.findMany({ where: { tour: { tontineId } }, select: { participationId: true, tourId: true, statut: true, montant: true } });
      assert.equal(cotisations.length, 9);
      assert.ok(cotisations.every((cotisation) => cotisation.statut === 'non_paye' && Number(cotisation.montant) === 5000));
      // Chaque couple (membre, tour) doit être unique : 9 couples différents, donc pas de doublon.
      assert.equal(new Set(cotisations.map((cotisation) => `${cotisation.participationId}-${cotisation.tourId}`)).size, 9);
    });

    it('un membre consulte le même calendrier', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'GET', chemin(tontineId, 'tours'), { jeton: moussa.jeton });
      assert.equal(statut, 200);
      assert.equal(donnees.tours.length, 3);
      assert.equal(donnees.tour_en_cours, 1);
    });

    it('refuse un second démarrage (409) sans créer de doublon', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'POST', chemin(tontineId, 'demarrer'), { jeton: awa.jeton, corps: { date_debut: dateDebut } });
      assert.equal(statut, 409);
      assert.match(donnees.erreur, /déjà démarrée/);
      assert.equal(await prisma.tour.count({ where: { tontineId } }), 3);
      assert.equal(await prisma.cotisation.count({ where: { tour: { tontineId } } }), 9);
    });

    it('l’ordre de passage est figé après le démarrage (400)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', chemin(tontineId, 'ordre'), { jeton: awa.jeton, corps: { ordre: [moussa.id, fatou.id, awa.id] } });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /Ordre figé/);
    });
  });

  describe('Dates selon la fréquence', () => {
    // Début le 31 janvier 2031 : le cas du mensuel (fin de mois) est le plus piégeux.
    const cas = [
      ['quotidien', ['2031-01-31', '2031-02-01', '2031-02-02']],
      ['hebdomadaire', ['2031-01-31', '2031-02-07', '2031-02-14']],
      ['mensuel', ['2031-01-31', '2031-02-28', '2031-03-31']],
    ];
    for (const [frequence, datesAttendues] of cas) {
      it(`${frequence} : ${datesAttendues.join(', ')}`, async () => {
        const gerant = await outils.creerCompte(serveur, 'Gerant');
        const second = await outils.creerCompte(serveur, 'Second');
        const troisieme = await outils.creerCompte(serveur, 'Troisieme');
        const id = await outils.creerTontine(serveur, gerant, 3, frequence);
        await outils.ajouterMembre(serveur, gerant, id, second);
        await outils.ajouterMembre(serveur, gerant, id, troisieme);
        await outils.appeler(serveur, 'PUT', chemin(id, 'ordre'), { jeton: gerant.jeton, corps: { ordre: [gerant.id, second.id, troisieme.id] } });
        const { statut, donnees } = await outils.appeler(serveur, 'POST', chemin(id, 'demarrer'), { jeton: gerant.jeton, corps: { date_debut: '2031-01-31' } });
        assert.equal(statut, 201);
        assert.deepEqual(donnees.tours.map((tour) => tour.date_prevue), datesAttendues);
      });
    }
  });
});