const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const outils = require('./outils');

// Date du jour + n jours, au format AAAA-MM-JJ (UTC, comme le serveur).
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);

describe('Module 3.1 et 3.4 : consulter les cotisations', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;
  let tontineId;

  // Raccourci : liste les cotisations d'une tontine avec un jeton et des filtres facultatifs.
  const lister = (id, jeton, requete = '') => outils.appeler(serveur, 'GET', `/api/tontines/${id}/cotisations${requete}`, { jeton });
  // Raccourci : retrouve en base la cotisation d'un membre pour un numéro de tour.
  const trouver = (idTontine, utilisateurId, numero) => prisma.cotisation.findFirst({
    where: { tour: { tontineId: idTontine, numero }, participation: { utilisateurId } },
    select: { id: true },
  });

  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
    // Tontine de 3 membres déjà démarrée : 9 cotisations (3 tours x 3 membres).
    tontineId = await outils.creerTontineDemarree(serveur, awa, [moussa, fatou], dans(7));
  });

  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  describe('Accès et validation', () => {
    it('refuse un appel sans jeton (401)', async () => {
      assert.equal((await lister(tontineId, undefined)).statut, 401);
    });

    it('refuse un identifiant invalide (400)', async () => {
      assert.equal((await lister('abc', awa.jeton)).statut, 400);
    });

    it('refuse un non-participant (403)', async () => {
      assert.equal((await lister(tontineId, ibrahim.jeton)).statut, 403);
    });

    it('refuse des filtres invalides (400)', async () => {
      for (const requete of ['?utilisateur_id=abc', '?statut=inconnu', '?en_retard=peut-etre']) {
        const { statut } = await lister(tontineId, awa.jeton, requete);
        assert.equal(statut, 400, requete);
      }
    });

    it('avant le démarrage, la liste est vide (200)', async () => {
      const gerant = await outils.creerCompte(serveur, 'Gerant en attente');
      const idNonDemarree = await outils.creerTontine(serveur, gerant, 3);
      const { statut, donnees } = await lister(idNonDemarree, gerant.jeton);
      assert.equal(statut, 200);
      assert.deepEqual(donnees.cotisations, []);
    });
  });

  describe('Lecture', () => {
    it('le gérant voit les 9 cotisations, triées par échéance', async () => {
      const { statut, donnees } = await lister(tontineId, awa.jeton);
      assert.equal(statut, 200);
      assert.equal(donnees.cotisations.length, 9);
      const echeances = donnees.cotisations.map((cotisation) => cotisation.date_echeance);
      assert.deepEqual(echeances, [...echeances].sort());
    });

    it('chaque cotisation porte les bonnes informations', async () => {
      const { donnees } = await lister(tontineId, awa.jeton);
      const premiere = donnees.cotisations[0];
      assert.equal(premiere.tour_numero, 1);
      assert.equal(premiere.beneficiaire.nom, 'Awa');
      assert.equal(Number(premiere.montant), 5000);
      assert.equal(premiere.date_echeance, dans(7));
      assert.equal(premiere.date_paiement, null);
      assert.equal(premiere.statut, 'non_paye');
      assert.equal(premiere.en_retard, false);
      assert.equal(premiere.preuve_disponible, false);
      assert.equal(premiere.note_refus, null);
    });

    it('un membre ne voit que ses 3 cotisations, une par tour', async () => {
      const { statut, donnees } = await lister(tontineId, moussa.jeton);
      assert.equal(statut, 200);
      assert.equal(donnees.cotisations.length, 3);
      assert.ok(donnees.cotisations.every((cotisation) => cotisation.membre.utilisateur_id === moussa.id));
      assert.deepEqual(donnees.cotisations.map((cotisation) => cotisation.tour_numero), [1, 2, 3]);
    });

    it('un membre peut demander explicitement ses propres cotisations (200)', async () => {
      const { statut, donnees } = await lister(tontineId, moussa.jeton, `?utilisateur_id=${moussa.id}`);
      assert.equal(statut, 200);
      assert.equal(donnees.cotisations.length, 3);
    });

    it('un membre ne peut pas demander celles d’un autre (403)', async () => {
      const { statut } = await lister(tontineId, moussa.jeton, `?utilisateur_id=${fatou.id}`);
      assert.equal(statut, 403);
    });

    it('le gérant filtre sur un membre précis', async () => {
      const { donnees } = await lister(tontineId, awa.jeton, `?utilisateur_id=${fatou.id}`);
      assert.equal(donnees.cotisations.length, 3);
      assert.ok(donnees.cotisations.every((cotisation) => cotisation.membre.utilisateur_id === fatou.id));
    });

    it('le filtre sur le statut ne renvoie que les cotisations concernées', async () => {
      const cible = await trouver(tontineId, moussa.id, 1);
      await prisma.cotisation.update({ where: { id: cible.id }, data: { statut: 'en_attente', datePaiement: new Date() } });
      const attente = await lister(tontineId, awa.jeton, '?statut=en_attente');
      assert.deepEqual(attente.donnees.cotisations.map((cotisation) => cotisation.cotisation_id), [cible.id]);
      const payees = await lister(tontineId, awa.jeton, '?statut=paye');
      assert.deepEqual(payees.donnees.cotisations, []);
    });

    it('n’expose jamais le chemin du fichier de preuve', async () => {
      const cible = await trouver(tontineId, moussa.id, 1);
      await prisma.cotisation.update({ where: { id: cible.id }, data: { preuveUrl: 'preuves/secret-preuve.jpg' } });
      const { donnees } = await lister(tontineId, awa.jeton);
      const ligne = donnees.cotisations.find((cotisation) => cotisation.cotisation_id === cible.id);
      assert.equal(ligne.preuve_disponible, true);
      assert.ok(!JSON.stringify(donnees).includes('secret-preuve'));
    });
  });

  describe('Retards', () => {
    let gerantR;
    let membreA;
    let membreB;
    let idRetard;
    let retardA1;
    let retardB1;
    const passe = new Date('2020-01-01T00:00:00.000Z');

    // Tontine dédiée : on fabrique des échéances passées directement en base.
    before(async () => {
      gerantR = await outils.creerCompte(serveur, 'Gerante R');
      membreA = await outils.creerCompte(serveur, 'Membre A');
      membreB = await outils.creerCompte(serveur, 'Membre B');
      idRetard = await outils.creerTontineDemarree(serveur, gerantR, [membreA, membreB], dans(7));
      retardA1 = (await trouver(idRetard, membreA.id, 1)).id;
      const attenteA2 = (await trouver(idRetard, membreA.id, 2)).id;
      const payeeA3 = (await trouver(idRetard, membreA.id, 3)).id;
      retardB1 = (await trouver(idRetard, membreB.id, 1)).id;
      // A tour 1 : non payée et échue, donc en retard.
      await prisma.cotisation.update({ where: { id: retardA1 }, data: { dateEcheance: passe } });
      // A tour 2 : déclarée (en attente) et échue, donc PAS en retard : le membre a fait sa part.
      await prisma.cotisation.update({ where: { id: attenteA2 }, data: { dateEcheance: passe, statut: 'en_attente' } });
      // A tour 3 : validée et échue, donc PAS en retard.
      await prisma.cotisation.update({ where: { id: payeeA3 }, data: { dateEcheance: passe, statut: 'paye' } });
      // B tour 1 : refusée et échue, donc en retard (le membre doit recotiser).
      await prisma.cotisation.update({ where: { id: retardB1 }, data: { dateEcheance: passe, statut: 'refuse', noteRefus: 'montant incorrect' } });
    });

    it('en_retard=true ne renvoie que les cotisations à payer dont l’échéance est passée', async () => {
      const { donnees } = await lister(idRetard, gerantR.jeton, '?en_retard=true');
      assert.deepEqual(donnees.cotisations.map((cotisation) => cotisation.cotisation_id).sort(), [retardA1, retardB1].sort());
      assert.ok(donnees.cotisations.every((cotisation) => cotisation.en_retard === true));
    });

    it('en_retard=false renvoie les 7 autres', async () => {
      const { donnees } = await lister(idRetard, gerantR.jeton, '?en_retard=false');
      assert.equal(donnees.cotisations.length, 7);
      assert.ok(donnees.cotisations.every((cotisation) => cotisation.en_retard === false));
    });

    it('une cotisation déclarée ou validée n’est jamais en retard, même échue', async () => {
      const { donnees } = await lister(idRetard, membreA.jeton);
      const parTour = Object.fromEntries(donnees.cotisations.map((cotisation) => [cotisation.tour_numero, cotisation]));
      assert.equal(parTour[1].en_retard, true);
      assert.equal(parTour[2].statut, 'en_attente');
      assert.equal(parTour[2].en_retard, false);
      assert.equal(parTour[3].statut, 'paye');
      assert.equal(parTour[3].en_retard, false);
    });

    it('une cotisation refusée échue est en retard et montre le motif', async () => {
      const { donnees } = await lister(idRetard, gerantR.jeton, '?statut=refuse&en_retard=true');
      assert.equal(donnees.cotisations.length, 1);
      assert.equal(donnees.cotisations[0].cotisation_id, retardB1);
      assert.equal(donnees.cotisations[0].note_refus, 'montant incorrect');
    });

    it('un membre filtre ses propres retards', async () => {
      const { donnees } = await lister(idRetard, membreA.jeton, '?en_retard=true');
      assert.deepEqual(donnees.cotisations.map((cotisation) => cotisation.cotisation_id), [retardA1]);
    });
  });
});