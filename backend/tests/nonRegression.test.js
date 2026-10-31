// Ce fichier vérifie les routes existantes et leurs réponses sans dépendance de test externe.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

// L'API doit déjà être démarrée et pointer vers une base locale jetable autorisée.
const adresseApi = process.env.API_URL || 'http://localhost:3000';
const suffixe = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const telephoneGerant = `+336${suffixe.slice(-8)}`;
const telephoneMembre = `+337${suffixe.slice(-8)}`;
const telephoneSecondMembre = `+338${suffixe.slice(-8)}`;
let jetonGerant;
let jetonMembre;
let idTontine;
let idMembre;
let idSecondMembre;

// Cette fonction envoie une requête JSON et garde le statut avec le corps reçu.
async function appeler(chemin, options = {}) {
  const reponse = await fetch(`${adresseApi}${chemin}`, options);
  const texte = await reponse.text();
  let corps = null;
  if (texte) {
    try { corps = JSON.parse(texte); } catch { corps = texte; }
  }
  return { statut: reponse.status, corps };
}

// Cette fonction ajoute automatiquement le jeton d'un utilisateur aux requêtes protégées.
function avecJeton(jeton, options = {}) {
  return {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${jeton}` },
  };
}

// Cette suite relève les contrats HTTP actuels et les vérifie avant et après le refactor.
test('contrats HTTP de référence de l’API Tontine', async (contexte) => {
  // La route de santé conserve un objet avec un message texte.
  await contexte.test('route de santé', async () => {
    const resultat = await appeler('/');
    assert.equal(resultat.statut, 200);
    assert.deepEqual(resultat.corps, { message: 'API Tontine OK' });
  });

  // La route de diagnostic conserve sa réponse sous forme de liste JSON.
  await contexte.test('diagnostic de la base', async () => {
    const resultat = await appeler('/test-db');
    assert.equal(resultat.statut, 200);
    assert.ok(Array.isArray(resultat.corps));
  });

  // Une inscription crée un utilisateur et renvoie un jeton sans hash de mot de passe.
  await contexte.test('inscription, connexion et refus d’authentification', async () => {
    const inscription = await appeler('/api/auth/inscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: 'Gérant Test', telephone: telephoneGerant, motDePasse: 'test1234' }),
    });
    assert.equal(inscription.statut, 201);
    assert.equal(typeof inscription.corps.token, 'string');
    assert.deepEqual(Object.keys(inscription.corps.utilisateur).sort(), ['id', 'nom', 'photo', 'telephone']);
    assert.equal(typeof inscription.corps.utilisateur.id, 'number');
    assert.equal(inscription.corps.utilisateur.photo, null);
    jetonGerant = inscription.corps.token;

    const connexion = await appeler('/api/auth/connexion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telephone: telephoneGerant, motDePasse: 'test1234' }),
    });
    assert.equal(connexion.statut, 200);
    assert.equal(typeof connexion.corps.token, 'string');
    assert.equal(Object.hasOwn(connexion.corps.utilisateur, 'motDePasseHash'), false);

    const sansJeton = await appeler('/api/profil');
    assert.equal(sansJeton.statut, 401);
    assert.deepEqual(Object.keys(sansJeton.corps), ['erreur']);
    const jetonInvalide = await appeler('/api/profil', { headers: { Authorization: 'Bearer invalide' } });
    assert.equal(jetonInvalide.statut, 401);
    assert.deepEqual(Object.keys(jetonInvalide.corps), ['erreur']);
  });

  // Le profil expose quatre champs et les modifications gardent leur message actuel.
  await contexte.test('lecture, modification et photo du profil', async () => {
    const profil = await appeler('/api/profil', avecJeton(jetonGerant));
    assert.equal(profil.statut, 200);
    assert.deepEqual(Object.keys(profil.corps).sort(), ['dateCreation', 'id', 'nom', 'photo', 'telephone']);
    assert.equal(typeof profil.corps.id, 'number');
    assert.equal(typeof profil.corps.dateCreation, 'string');

    const modification = await appeler('/api/profil', avecJeton(jetonGerant, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: 'Gérant Test Modifié', telephone: telephoneGerant }),
    }));
    assert.equal(modification.statut, 200);
    assert.deepEqual(modification.corps, { message: 'Profil mis à jour', nom: 'Gérant Test Modifié', telephone: telephoneGerant });

    const formulaire = new FormData();
    formulaire.append('photo', new Blob([Buffer.from('image-test')], { type: 'image/png' }), 'photo.png');
    const photo = await appeler('/api/profil/photo', avecJeton(jetonGerant, { method: 'POST', body: formulaire }));
    assert.equal(photo.statut, 200);
    assert.equal(photo.corps.message, 'Photo mise à jour');
    assert.equal(typeof photo.corps.photo, 'string');
    assert.match(photo.corps.photo, /^\/uploads\//);
  });

  // Les contacts ne renvoient que les suggestions correspondant aux empreintes envoyées.
  await contexte.test('contacts et correspondance', async () => {
    const inscription = await appeler('/api/auth/inscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: 'Membre Test', telephone: telephoneMembre, motDePasse: 'test1234' }),
    });
    assert.equal(inscription.statut, 201);
    jetonMembre = inscription.corps.token;
    idMembre = inscription.corps.utilisateur.id;
    const secondInscription = await appeler('/api/auth/inscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: 'Deuxième Membre Test', telephone: telephoneSecondMembre, motDePasse: 'test1234' }),
    });
    assert.equal(secondInscription.statut, 201);
    idSecondMembre = secondInscription.corps.utilisateur.id;
  });

  // Création, liste, détail, adhésion et erreurs conservent les contrats historiques.
  await contexte.test('création, liste, détail et gestion des membres', async () => {
    const creation = await appeler('/api/tontines', avecJeton(jetonGerant, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: `Tontine Test ${suffixe}`, montant_cotisation: 1000, frequence: 'mensuel', nombre_membres: 3, regles: 'Test' }),
    }));
    assert.equal(creation.statut, 201);
    assert.deepEqual(Object.keys(creation.corps).sort(), ['id', 'message', 'statut']);
    assert.equal(creation.corps.statut, 'en_preparation');
    idTontine = creation.corps.id;

    const liste = await appeler('/api/tontines', avecJeton(jetonGerant));
    assert.equal(liste.statut, 200);
    assert.ok(Array.isArray(liste.corps));
    assert.ok(liste.corps.some((tontine) => tontine.id === idTontine));

    const detail = await appeler(`/api/tontines/${idTontine}`, avecJeton(jetonGerant));
    assert.equal(detail.statut, 200);
    assert.deepEqual(Object.keys(detail.corps).sort(), ['duree_cycle', 'membres', 'role_code', 'tontine']);
    assert.equal(detail.corps.role_code, 'gerant');

    const empreinte = createHash('sha256').update(telephoneMembre).digest('hex');
    const contacts = await appeler(`/api/contacts/correspondance?tontineId=${idTontine}`, avecJeton(jetonGerant, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empreintes: [empreinte] }),
    }));
    assert.equal(contacts.statut, 200);
    assert.ok(Array.isArray(contacts.corps));
    assert.ok(contacts.corps.some((contact) => contact.id === idMembre));

    const nonGerant = await appeler(`/api/tontines/${idTontine}/membres`, avecJeton(jetonMembre, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utilisateurId: idMembre }),
    }));
    assert.equal(nonGerant.statut, 403);
    assert.deepEqual(Object.keys(nonGerant.corps), ['erreur']);

    const ajout = await appeler(`/api/tontines/${idTontine}/membres`, avecJeton(jetonGerant, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utilisateurId: idMembre }),
    }));
    assert.equal(ajout.statut, 201);
    assert.deepEqual(ajout.corps, { message: 'Membre ajouté avec succès' });

    const dejaMembre = await appeler(`/api/tontines/${idTontine}/membres`, avecJeton(jetonGerant, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utilisateurId: idMembre }),
    }));
    assert.equal(dejaMembre.statut, 409);
    assert.deepEqual(Object.keys(dejaMembre.corps), ['erreur']);

    const secondAjout = await appeler(`/api/tontines/${idTontine}/membres`, avecJeton(jetonGerant, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utilisateurId: idSecondMembre }),
    }));
    assert.equal(secondAjout.statut, 201);

    const plein = await appeler(`/api/tontines/${idTontine}/membres`, avecJeton(jetonGerant, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telephone: '+33999999999' }),
    }));
    assert.equal(plein.statut, 400);
    assert.deepEqual(Object.keys(plein.corps), ['erreur']);

    const ajoutIntrouvable = await appeler('/api/tontines/999999999/membres', avecJeton(jetonGerant, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utilisateurId: idMembre }),
    }));
    assert.equal(ajoutIntrouvable.statut, 403);
    assert.deepEqual(Object.keys(ajoutIntrouvable.corps), ['erreur']);

    const retrait = await appeler(`/api/tontines/${idTontine}/membres/${idMembre}`, avecJeton(jetonGerant, { method: 'DELETE' }));
    assert.equal(retrait.statut, 200);
    assert.deepEqual(retrait.corps, { message: 'Membre retiré' });
  });

  // Une tontine inconnue suit le contrôle de participation actuel, qui répond 403.
  await contexte.test('accès aux ressources inconnues', async () => {
    const detailInconnu = await appeler('/api/tontines/999999999', avecJeton(jetonGerant));
    assert.equal(detailInconnu.statut, 403);
    assert.deepEqual(Object.keys(detailInconnu.corps), ['erreur']);
    const contactsInterdits = await appeler('/api/contacts/correspondance?tontineId=999999999', avecJeton(jetonMembre, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empreintes: [] }),
    }));
    assert.equal(contactsInterdits.statut, 403);
    assert.deepEqual(Object.keys(contactsInterdits.corps), ['erreur']);
  });
});
