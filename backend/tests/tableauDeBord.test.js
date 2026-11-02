// Ces tests vérifient le tableau de bord (5.1) : accès, tours, compteurs de cotisations, retards et montants.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

describe('Module 5.1 : tableau de bord', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;

  // Raccourcis : chemin, lecture du tableau de bord, retrouver / déclarer / valider / refuser une cotisation.
  const chemin = (idTontine, fin) => `/api/tontines/${idTontine}/${fin}`;
  const tableau = (idTontine, jeton) => outils.appeler(serveur, 'GET', chemin(idTontine, 'tableau-de-bord'), { jeton });
  const trouver = async (idTontine, utilisateurId, numero) => (await prisma.cotisation.findFirst({
    where: { tour: { tontineId: idTontine, numero }, participation: { utilisateurId } },
    select: { id: true },
  })).id;
  const declarer = async (idTontine, compte, numero) => {
    const id = await trouver(idTontine, compte.id, numero);
    const { statut } = await outils.appeler(serveur, 'POST', chemin(idTontine, `cotisations/${id}/declaration`), { jeton: compte.jeton, corps: {} });
    assert.equal(statut, 200);
  };
  const decider = async (idTontine, gerant, compte, numero, corps) => {
    const id = await trouver(idTontine, compte.id, numero);
    const { statut } = await outils.appeler(serveur, 'POST', chemin(idTontine, `cotisations/${id}/validation`), { jeton: gerant.jeton, corps });
    assert.equal(statut, 200);
  };
  const valider = (idTontine, gerant, compte, numero) => decider(idTontine, gerant, compte, numero, { decision: 'valider' });
  const refuser = (idTontine, gerant, compte, numero) => decider(idTontine, gerant, compte, numero, { decision: 'refuser', note: 'Photo illisible' });
  // Chaque compte déclare sa cotisation du tour, puis le gérant la valide.
  const payer = async (idTontine, gerant, comptes, numero) => {
    for (const compte of comptes) {
      await declarer(idTontine, compte, numero);
      await valider(idTontine, gerant, compte, numero);
    }
  };
  const remettre = (idTontine, numero, jeton) => outils.appeler(serveur, 'POST', chemin(idTontine, `tours/${numero}/remise`), { jeton });
  // Awa gérante, ordre : Awa (tour 1), Moussa (tour 2), Fatou (tour 3).
  const nouvelleTontine = () => outils.creerTontineDemarree(serveur, awa, [moussa, fatou], dans(7));

  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
  });

  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  describe('Refus', () => {
    let tontineId;
    before(async () => { tontineId = await nouvelleTontine(); });

    it('refuse un appel sans jeton (401)', async () => {
      assert.equal((await tableau(tontineId, undefined)).statut, 401);
    });

    it('refuse un identifiant invalide (400)', async () => {
      assert.equal((await tableau('abc', awa.jeton)).statut, 400);
    });

    it('refuse un non-participant (403)', async () => {
      assert.equal((await tableau(tontineId, ibrahim.jeton)).statut, 403);
    });

    it('répond 403 pour une tontine inexistante, sans révéler quelles tontines existent', async () => {
      assert.equal((await tableau(999999999, awa.jeton)).statut, 403);
    });
  });

  describe('Avant le démarrage', () => {
    it('aucun tour, compteurs et montants à zéro', async () => {
      const tontineId = await outils.creerTontine(serveur, awa, 3);
      const { statut, donnees } = await tableau(tontineId, awa.jeton);
      assert.equal(statut, 200);
      assert.equal(donnees.tontine.statut, 'en_preparation');
      assert.equal(donnees.tour_en_cours, null);
      assert.equal(donnees.tour_suivant, null);
      assert.deepEqual(donnees.cotisations_tour_en_cours, { total: 0, payees: 0, en_attente: 0, non_payees: 0, refusees: 0, en_retard: 0 });
      assert.deepEqual(donnees.montants_tour_en_cours, { attendu: '0', valide: '0' });
    });
  });

  describe('Tontine démarrée, aucun paiement', () => {
    let tontineId;
    let reponse;
    before(async () => {
      tontineId = await nouvelleTontine();
      reponse = await tableau(tontineId, awa.jeton);
    });

    it('donne les informations générales de la tontine (200)', () => {
      assert.equal(reponse.statut, 200);
      const { tontine } = reponse.donnees;
      assert.equal(tontine.id, tontineId);
      assert.equal(tontine.statut, 'actif');
      assert.equal(tontine.frequence, 'mensuel');
      assert.equal(Number(tontine.montant_cotisation), 5000);
      assert.equal(tontine.nombre_membres, 3);
    });

    it('indique le tour en cours (Awa) et le tour suivant (Moussa)', () => {
      const { tour_en_cours: enCours, tour_suivant: suivant } = reponse.donnees;
      assert.equal(enCours.numero, 1);
      assert.equal(enCours.date_prevue, dans(7));
      assert.deepEqual(enCours.beneficiaire, { utilisateur_id: awa.id, nom: 'Awa' });
      assert.equal(suivant.numero, 2);
      assert.deepEqual(suivant.beneficiaire, { utilisateur_id: moussa.id, nom: 'Moussa' });
    });

    it('compte 3 cotisations non payées et une cagnotte attendue de 15000, rien de validé', () => {
      assert.deepEqual(reponse.donnees.cotisations_tour_en_cours, { total: 3, payees: 0, en_attente: 0, non_payees: 3, refusees: 0, en_retard: 0 });
      assert.equal(Number(reponse.donnees.montants_tour_en_cours.attendu), 15000);
      assert.equal(Number(reponse.donnees.montants_tour_en_cours.valide), 0);
    });

    it('un simple membre reçoit exactement la même réponse que le gérant', async () => {
      const membre = await tableau(tontineId, moussa.jeton);
      assert.equal(membre.statut, 200);
      assert.deepEqual(membre.donnees, reponse.donnees);
    });
  });

  describe('Statuts des cotisations', () => {
    it('compte chaque statut : Fatou payée, Moussa en attente, Awa refusée', async () => {
      const tontineId = await nouvelleTontine();
      await payer(tontineId, awa, [fatou], 1);
      await declarer(tontineId, moussa, 1);
      await declarer(tontineId, awa, 1);
      await refuser(tontineId, awa, awa, 1);
      const { statut, donnees } = await tableau(tontineId, awa.jeton);
      assert.equal(statut, 200);
      assert.deepEqual(donnees.cotisations_tour_en_cours, { total: 3, payees: 1, en_attente: 1, non_payees: 0, refusees: 1, en_retard: 0 });
      // Seule la cotisation validée de Fatou compte dans le montant réuni.
      assert.equal(Number(donnees.montants_tour_en_cours.valide), 5000);
      assert.equal(Number(donnees.montants_tour_en_cours.attendu), 15000);
    });

    it('compte les retards : seules les cotisations à payer dont l’échéance est passée', async () => {
      const tontineId = await nouvelleTontine();
      // On recule l’échéance de Moussa et de Fatou à il y a 2 jours (directement en base de test).
      const echue = new Date(Date.now() - 2 * 86400000);
      for (const compte of [moussa, fatou]) {
        const id = await trouver(tontineId, compte.id, 1);
        await prisma.cotisation.update({ where: { id }, data: { dateEcheance: echue } });
      }
      // Fatou paie : une cotisation validée n’est jamais en retard, même échue.
      await payer(tontineId, awa, [fatou], 1);
      let { donnees } = await tableau(tontineId, awa.jeton);
      assert.deepEqual(donnees.cotisations_tour_en_cours, { total: 3, payees: 1, en_attente: 0, non_payees: 2, refusees: 0, en_retard: 1 });
      // Moussa déclare : une cotisation en attente n’est plus en retard.
      await declarer(tontineId, moussa, 1);
      ({ donnees } = await tableau(tontineId, awa.jeton));
      assert.deepEqual(donnees.cotisations_tour_en_cours, { total: 3, payees: 1, en_attente: 1, non_payees: 1, refusees: 0, en_retard: 0 });
    });
  });

  describe('Avancée des tours', () => {
    it('suit le tour en cours, le tour suivant, puis la fin de la tontine', async () => {
      const tontineId = await nouvelleTontine();
      const tous = [awa, moussa, fatou];

      // Tour 1 payé, puis remis : Moussa devient bénéficiaire, Fatou est la suivante, compteurs repartis à zéro.
      await payer(tontineId, awa, tous, 1);
      assert.equal((await remettre(tontineId, 1, awa.jeton)).statut, 200);
      let { donnees } = await tableau(tontineId, awa.jeton);
      assert.equal(donnees.tour_en_cours.numero, 2);
      assert.equal(donnees.tour_en_cours.beneficiaire.utilisateur_id, moussa.id);
      assert.equal(donnees.tour_suivant.numero, 3);
      assert.equal(donnees.tour_suivant.beneficiaire.utilisateur_id, fatou.id);
      assert.deepEqual(donnees.cotisations_tour_en_cours, { total: 3, payees: 0, en_attente: 0, non_payees: 3, refusees: 0, en_retard: 0 });
      assert.equal(Number(donnees.montants_tour_en_cours.valide), 0);

      // Tour 2 : il ne reste plus de tour suivant à la fin du dernier tour.
      await payer(tontineId, awa, tous, 2);
      assert.equal((await remettre(tontineId, 2, awa.jeton)).statut, 200);
      ({ donnees } = await tableau(tontineId, awa.jeton));
      assert.equal(donnees.tour_en_cours.numero, 3);
      assert.equal(donnees.tour_en_cours.beneficiaire.utilisateur_id, fatou.id);
      assert.equal(donnees.tour_suivant, null);

      // Tour 3 remis : la tontine est terminée, plus aucun tour en cours.
      await payer(tontineId, awa, tous, 3);
      assert.equal((await remettre(tontineId, 3, awa.jeton)).statut, 200);
      ({ donnees } = await tableau(tontineId, awa.jeton));
      assert.equal(donnees.tontine.statut, 'termine');
      assert.equal(donnees.tour_en_cours, null);
      assert.equal(donnees.tour_suivant, null);
      assert.deepEqual(donnees.cotisations_tour_en_cours, { total: 0, payees: 0, en_attente: 0, non_payees: 0, refusees: 0, en_retard: 0 });
    });
  });
});