// describe regroupe des tests, it décrit un test, before/after préparent et nettoient.
const { describe, it, before, after } = require('node:test');
// assert vérifie les résultats : un test échoue si une vérification est fausse.
const assert = require('node:assert/strict');
const outils = require('./outils');

// Petit raccourci : extrait la liste des identifiants dans l'ordre de la réponse.
const identifiants = (donnees) => donnees.membres.map((membre) => membre.utilisateur_id);

describe('Module 4.1 : ordre de passage', () => {
  let serveur;
  let prisma;
  let awa;
  let moussa;
  let fatou;
  let ibrahim;
  let tontineId;

  // Avant les tests : on démarre le serveur et on prépare une tontine de 3 membres.
  before(async () => {
    serveur = await outils.demarrerServeur();
    prisma = outils.ouvrirPrisma();
    awa = await outils.creerCompte(serveur, 'Awa');
    moussa = await outils.creerCompte(serveur, 'Moussa');
    fatou = await outils.creerCompte(serveur, 'Fatou');
    // Ibrahim a un compte mais ne participe à aucune tontine.
    ibrahim = await outils.creerCompte(serveur, 'Ibrahim');
    tontineId = await outils.creerTontine(serveur, awa, 3);
    await outils.ajouterMembre(serveur, awa, tontineId, moussa);
    await outils.ajouterMembre(serveur, awa, tontineId, fatou);
  });

  // Après les tests : on ferme la base et on arrête le serveur.
  after(async () => {
    await prisma.$disconnect();
    serveur.arreter();
  });

  // Les tests d'un même describe s'exécutent dans l'ordre où ils sont écrits.
  describe('GET /api/tontines/:id/ordre', () => {
    it('refuse un appel sans jeton (401)', async () => {
      const { statut } = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/ordre`);
      assert.equal(statut, 401);
    });

    it('refuse un identifiant invalide (400)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'GET', '/api/tontines/abc/ordre', { jeton: awa.jeton });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /Identifiant invalide/);
    });

    it('refuse une personne qui ne participe pas à la tontine (403)', async () => {
      const { statut } = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/ordre`, { jeton: ibrahim.jeton });
      assert.equal(statut, 403);
    });

    it('répond 403 pour une tontine inexistante, sans révéler quelles tontines existent', async () => {
      const { statut } = await outils.appeler(serveur, 'GET', '/api/tontines/999999999/ordre', { jeton: awa.jeton });
      assert.equal(statut, 403);
    });

    it('avant tout ordre : ordre_defini est faux et les ordres sont vides, triés par nom', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton });
      assert.equal(statut, 200);
      assert.equal(donnees.ordre_defini, false);
      assert.equal(donnees.statut, 'en_preparation');
      assert.deepEqual(donnees.membres.map((membre) => membre.nom), ['Awa', 'Fatou', 'Moussa']);
      assert.ok(donnees.membres.every((membre) => membre.ordre_passage === null));
    });

    it('un membre simple peut consulter l’ordre (200)', async () => {
      const { statut } = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/ordre`, { jeton: moussa.jeton });
      assert.equal(statut, 200);
    });
  });

  describe('PUT /api/tontines/:id/ordre', () => {
    it('refuse un appel sans jeton (401)', async () => {
      const { statut } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { corps: { ordre: [awa.id, fatou.id, moussa.id] } });
      assert.equal(statut, 401);
    });

    it('refuse un simple membre (403)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: moussa.jeton, corps: { ordre: [awa.id, fatou.id, moussa.id] } });
      assert.equal(statut, 403);
      assert.match(donnees.erreur, /gérant/);
    });

    it('refuse un non-participant (403)', async () => {
      const { statut } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: ibrahim.jeton, corps: { ordre: [awa.id, fatou.id, moussa.id] } });
      assert.equal(statut, 403);
    });

    it('refuse une liste vide ou qui n’est pas une liste d’entiers (400)', async () => {
      for (const ordre of [[], 'abc', [awa.id, 'x', moussa.id], [0, 1, 2], undefined]) {
        const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps: { ordre } });
        assert.equal(statut, 400, `ordre = ${JSON.stringify(ordre)}`);
        assert.match(donnees.erreur, /Liste d.ordre invalide/);
      }
    });

    it('refuse un doublon (400)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps: { ordre: [awa.id, awa.id, moussa.id] } });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /plusieurs fois/);
    });

    it('refuse une liste incomplète (400)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps: { ordre: [awa.id, moussa.id] } });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /exactement les membres/);
    });

    it('refuse un identifiant qui n’appartient pas à la tontine (400)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps: { ordre: [awa.id, moussa.id, ibrahim.id] } });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /exactement les membres/);
    });

    it('les refus précédents n’ont rien modifié', async () => {
      const { donnees } = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton });
      assert.equal(donnees.ordre_defini, false);
      assert.ok(donnees.membres.every((membre) => membre.ordre_passage === null));
    });

    it('le gérant définit l’ordre : Awa, Fatou, puis Moussa (200)', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps: { ordre: [awa.id, fatou.id, moussa.id] } });
      assert.equal(statut, 200);
      assert.equal(donnees.ordre_defini, true);
      assert.deepEqual(identifiants(donnees), [awa.id, fatou.id, moussa.id]);
      assert.deepEqual(donnees.membres.map((membre) => membre.ordre_passage), [1, 2, 3]);
    });

    it('un membre relit le même ordre', async () => {
      const { donnees } = await outils.appeler(serveur, 'GET', `/api/tontines/${tontineId}/ordre`, { jeton: moussa.jeton });
      assert.equal(donnees.ordre_defini, true);
      assert.deepEqual(identifiants(donnees), [awa.id, fatou.id, moussa.id]);
    });

    it('rejouer la même requête donne le même résultat', async () => {
      const corps = { ordre: [awa.id, fatou.id, moussa.id] };
      const premier = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps });
      const second = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps });
      assert.equal(second.statut, 200);
      assert.deepEqual(second.donnees, premier.donnees);
    });

    it('le gérant peut remplacer l’ordre : Moussa passe en premier', async () => {
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${tontineId}/ordre`, { jeton: awa.jeton, corps: { ordre: [moussa.id, awa.id, fatou.id] } });
      assert.equal(statut, 200);
      assert.deepEqual(identifiants(donnees), [moussa.id, awa.id, fatou.id]);
    });
  });

  describe('Cas particuliers', () => {
    it('refuse de modifier l’ordre quand la tontine n’est plus en préparation (400)', async () => {
      // Tontine neuve, avec le gérant seul, puis démarrage simulé directement dans la base de test.
      const gerant = await outils.creerCompte(serveur, 'Gerant solo');
      const idTontine = await outils.creerTontine(serveur, gerant, 2);
      await prisma.tontine.update({ where: { id: idTontine }, data: { statut: 'actif' } });
      const { statut, donnees } = await outils.appeler(serveur, 'PUT', `/api/tontines/${idTontine}/ordre`, { jeton: gerant.jeton, corps: { ordre: [gerant.id] } });
      assert.equal(statut, 400);
      assert.match(donnees.erreur, /Ordre figé/);
    });

    it('un membre ajouté après la définition de l’ordre repasse ordre_defini à faux', async () => {
      const gerant = await outils.creerCompte(serveur, 'Gerant quatre');
      const premier = await outils.creerCompte(serveur, 'Premier');
      const retardataire = await outils.creerCompte(serveur, 'Retardataire');
      const idTontine = await outils.creerTontine(serveur, gerant, 4);
      await outils.ajouterMembre(serveur, gerant, idTontine, premier);
      const definition = await outils.appeler(serveur, 'PUT', `/api/tontines/${idTontine}/ordre`, { jeton: gerant.jeton, corps: { ordre: [gerant.id, premier.id] } });
      assert.equal(definition.donnees.ordre_defini, true);
      // Un troisième membre arrive : il n'a pas d'ordre, donc l'ordre n'est plus complet.
      await outils.ajouterMembre(serveur, gerant, idTontine, retardataire);
      const { donnees } = await outils.appeler(serveur, 'GET', `/api/tontines/${idTontine}/ordre`, { jeton: gerant.jeton });
      assert.equal(donnees.ordre_defini, false);
      const dernier = donnees.membres[donnees.membres.length - 1];
      assert.equal(dernier.utilisateur_id, retardataire.id);
      assert.equal(dernier.ordre_passage, null);
    });
  });
});