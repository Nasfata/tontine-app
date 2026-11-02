// Ces tests vérifient le suivi des paiements (5.2) : accès gérant, tri, détail des cotisations, bilan et choix du tour.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

describe('Module 5.2 : suivi des paiements', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;

  // Raccourcis : chemin, lecture du suivi, retrouver / déclarer / décider une cotisation, payer, remettre.
  const chemin = (idTontine, fin) => `/api/tontines/${idTontine}/${fin}`;
  const suivi = (idTontine, jeton, requete = '') => outils.appeler(serveur, 'GET', chemin(idTontine, `suivi-paiements${requete}`), { jeton });
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
      assert.equal((await suivi(tontineId, undefined)).statut, 401);
    });

    it('refuse un identifiant de tontine invalide (400)', async () => {
      assert.equal((await suivi('abc', awa.jeton)).statut, 400);
    });

    it('refuse un numéro de tour invalide (400)', async () => {
      for (const numero of ['abc', '0', '-1', '']) {
        assert.equal((await suivi(tontineId, awa.jeton, `?tour=${numero}`)).statut, 400, `tour = "${numero}"`);
      }
    });

    it('refuse un simple membre (403)', async () => {
      assert.equal((await suivi(tontineId, moussa.jeton)).statut, 403);
    });

    it('refuse un non-participant (403)', async () => {
      assert.equal((await suivi(tontineId, ibrahim.jeton)).statut, 403);
    });

    it('répond 404 pour un tour qui n’existe pas', async () => {
      assert.equal((await suivi(tontineId, awa.jeton, '?tour=9')).statut, 404);
    });
  });

  describe('Avant le démarrage', () => {
    it('aucun tour : le gérant est listé sans cotisation et avec un bilan vide', async () => {
      const tontineId = await outils.creerTontine(serveur, awa, 3);
      const { statut, donnees } = await suivi(tontineId, awa.jeton);
      assert.equal(statut, 200);
      assert.equal(donnees.statut, 'en_preparation');
      assert.equal(donnees.tour, null);
      assert.deepEqual(donnees.membres, [
        { utilisateur_id: awa.id, nom: 'Awa', cotisation: null, bilan: { payees: 0, total: 0, en_retard: 0 } },
      ]);
    });
  });

  describe('Tour en cours', () => {
    let tontineId;
    let reponse;
    let idCotisationMoussa;
    before(async () => {
      tontineId = await nouvelleTontine();
      // Moussa est en retard : on recule son échéance du tour 1 à il y a 2 jours (directement en base de test).
      idCotisationMoussa = await trouver(tontineId, moussa.id, 1);
      await prisma.cotisation.update({ where: { id: idCotisationMoussa }, data: { dateEcheance: new Date(Date.now() - 2 * 86400000) } });
      // Fatou paie, puis on lui attribue une preuve en base pour vérifier que le chemin n'est jamais exposé.
      await payer(tontineId, awa, [fatou], 1);
      const idCotisationFatou = await trouver(tontineId, fatou.id, 1);
      await prisma.cotisation.update({ where: { id: idCotisationFatou }, data: { preuveUrl: 'fichier-secret.jpg' } });
      // Awa déclare, puis son paiement est refusé.
      await declarer(tontineId, awa, 1);
      await refuser(tontineId, awa, awa, 1);
      reponse = await suivi(tontineId, awa.jeton);
    });

    it('renvoie le tour en cours et trie : Moussa en retard d’abord, puis Awa et Fatou par nom', () => {
      assert.equal(reponse.statut, 200);
      assert.equal(reponse.donnees.tontine_id, tontineId);
      assert.equal(reponse.donnees.statut, 'actif');
      assert.deepEqual(reponse.donnees.tour, { numero: 1, statut: 'en_cours', date_prevue: dans(7) });
      assert.deepEqual(reponse.donnees.membres.map((membre) => membre.nom), ['Moussa', 'Awa', 'Fatou']);
    });

    it('détaille la cotisation de chaque membre', () => {
      const [m, a, f] = reponse.donnees.membres;
      assert.equal(m.utilisateur_id, moussa.id);
      assert.equal(m.cotisation.cotisation_id, idCotisationMoussa);
      assert.equal(m.cotisation.statut, 'non_paye');
      assert.equal(Number(m.cotisation.montant), 5000);
      assert.equal(m.cotisation.date_paiement, null);
      assert.equal(m.cotisation.en_retard, true);
      assert.equal(a.cotisation.statut, 'refuse');
      assert.equal(a.cotisation.note_refus, 'Photo illisible');
      assert.equal(a.cotisation.date_echeance, dans(7));
      assert.equal(a.cotisation.en_retard, false);
      assert.equal(f.cotisation.statut, 'paye');
      assert.notEqual(f.cotisation.date_paiement, null);
      assert.equal(f.cotisation.en_retard, false);
    });

    it('calcule le bilan de chaque membre sur toute la tontine', () => {
      const [m, a, f] = reponse.donnees.membres;
      assert.deepEqual(m.bilan, { payees: 0, total: 3, en_retard: 1 });
      assert.deepEqual(a.bilan, { payees: 0, total: 3, en_retard: 0 });
      assert.deepEqual(f.bilan, { payees: 1, total: 3, en_retard: 0 });
    });

    it('n’expose jamais le chemin de la preuve : seulement a_une_preuve', () => {
      const [m, a, f] = reponse.donnees.membres;
      assert.equal(f.cotisation.a_une_preuve, true);
      assert.equal(m.cotisation.a_une_preuve, false);
      assert.equal(a.cotisation.a_une_preuve, false);
      assert.equal(JSON.stringify(reponse.donnees).includes('fichier-secret'), false);
    });

    it('sans paramètre, c’est le tour en cours : ?tour=1 donne exactement la même réponse', async () => {
      const explicite = await suivi(tontineId, awa.jeton, '?tour=1');
      assert.equal(explicite.statut, 200);
      assert.deepEqual(explicite.donnees, reponse.donnees);
    });

    it('?tour=2 montre le tour à venir : cotisations non payées, bilan inchangé', async () => {
      const { statut, donnees } = await suivi(tontineId, awa.jeton, '?tour=2');
      assert.equal(statut, 200);
      assert.deepEqual(donnees.tour, { numero: 2, statut: 'a_venir', date_prevue: donnees.tour.date_prevue });
      for (const membre of donnees.membres) {
        assert.equal(membre.cotisation.statut, 'non_paye');
        assert.equal(membre.cotisation.en_retard, false);
      }
      const fatouLigne = donnees.membres.find((membre) => membre.utilisateur_id === fatou.id);
      assert.deepEqual(fatouLigne.bilan, { payees: 1, total: 3, en_retard: 0 });
    });
  });

  describe('Tontine terminée', () => {
    it('sans paramètre : aucun tour ; avec ?tour=3 : l’historique reste consultable', async () => {
      const tontineId = await nouvelleTontine();
      const tous = [awa, moussa, fatou];
      for (const numero of [1, 2, 3]) {
        await payer(tontineId, awa, tous, numero);
        assert.equal((await remettre(tontineId, numero, awa.jeton)).statut, 200);
      }
      const courant = await suivi(tontineId, awa.jeton);
      assert.equal(courant.statut, 200);
      assert.equal(courant.donnees.statut, 'termine');
      assert.equal(courant.donnees.tour, null);
      for (const membre of courant.donnees.membres) {
        assert.equal(membre.cotisation, null);
        assert.deepEqual(membre.bilan, { payees: 3, total: 3, en_retard: 0 });
      }
      const historique = await suivi(tontineId, awa.jeton, '?tour=3');
      assert.equal(historique.statut, 200);
      assert.equal(historique.donnees.tour.numero, 3);
      assert.equal(historique.donnees.tour.statut, 'complete');
      for (const membre of historique.donnees.membres) assert.equal(membre.cotisation.statut, 'paye');
    });
  });
});