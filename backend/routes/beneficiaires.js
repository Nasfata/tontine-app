// Express fournit le routeur : un petit groupe de routes rangé dans son propre fichier.
const express = require('express');
// db est le client Prisma, notre porte d'entrée vers MySQL.
const db = require('../db');
// Ce middleware vérifie le jeton de connexion et remplit req.utilisateurId.
const verifierToken = require('../middleware/verifierAuthentification');
// Cette fonction renvoie le rôle de la personne dans une tontine (null si elle n'y participe pas).
const { verifierRole } = require('../utils/roles');
// Fonctions de validation partagées (identifiants et dates).
const { lireIdentifiant, lireDate } = require('../utils/validation');

// Crée le routeur de ce fichier.
const router = express.Router();

// Toutes les routes de ce fichier exigent d'être connecté.
router.use(verifierToken);

// Prépare la réponse commune au GET et au PUT : la liste des membres avec leur ordre.
// "client" est soit db (hors transaction), soit l'objet de transaction (dans une transaction).
async function construireOrdre(client, tontine) {
  // On lit chaque participation avec les informations publiques de la personne.
  const participations = await client.participation.findMany({
    where: { tontineId: tontine.id },
    select: {
      roleCode: true,
      ordrePassage: true,
      utilisateur: { select: { id: true, nom: true, photo: true } },
    },
  });

  // On trie : ordre croissant, ceux sans ordre à la fin, puis par nom.
  participations.sort((a, b) => {
    // "??" donne Infinity quand l'ordre est null, pour le placer en dernier.
    const ordreA = a.ordrePassage ?? Infinity;
    const ordreB = b.ordrePassage ?? Infinity;
    // Si les ordres diffèrent, le plus petit passe en premier.
    if (ordreA !== ordreB) return ordreA - ordreB;
    // Sinon, on trie par ordre alphabétique des noms.
    return a.utilisateur.nom.localeCompare(b.utilisateur.nom);
  });

  // L'ordre est défini si la liste triée est exactement 1, 2, 3 ... N (sans trou ni doublon).
  const ordreDefini = participations.length > 0
    && participations.every((participation, index) => participation.ordrePassage === index + 1);

  // On renvoie la forme annoncée dans le contrat, en snake_case comme le reste de l'API.
  return {
    tontine_id: tontine.id,
    statut: tontine.statut,
    ordre_defini: ordreDefini,
    membres: participations.map((participation) => ({
      utilisateur_id: participation.utilisateur.id,
      nom: participation.utilisateur.nom,
      photo: participation.utilisateur.photo,
      role_code: participation.roleCode,
      ordre_passage: participation.ordrePassage,
    })),
  };
}

// GET /api/tontines/:id/ordre : tout participant peut voir l'ordre de passage.
router.get('/:id/ordre', async (req, res) => {
  try {
    // On lit et on vérifie l'identifiant de la tontine dans l'adresse.
    const tontineId = lireIdentifiant(req.params.id);
    if (!tontineId) return res.status(400).json({ erreur: 'Identifiant invalide' });

    // Seul un participant a un rôle ici ; sinon c'est un refus (403).
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    if (!roleCode) return res.status(403).json({ erreur: 'Vous ne participez pas à cette tontine' });

    // On lit la tontine (garde-fou si elle a disparu entre-temps).
    const tontine = await db.tontine.findUnique({ where: { id: tontineId }, select: { id: true, statut: true } });
    if (!tontine) return res.status(404).json({ erreur: 'Tontine introuvable' });

    // On renvoie la liste ordonnée au client.
    return res.json(await construireOrdre(db, tontine));
  } catch (err) {
    // Le détail de l'erreur reste dans le terminal, le client reçoit un message simple.
    console.error('Erreur lecture ordre :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture de l’ordre de passage' });
  }
});

// PUT /api/tontines/:id/ordre : le gérant remplace l'ordre de passage.
router.put('/:id/ordre', async (req, res) => {
  try {
    // On lit et on vérifie l'identifiant de la tontine.
    const tontineId = lireIdentifiant(req.params.id);
    if (!tontineId) return res.status(400).json({ erreur: 'Identifiant invalide' });

    // Seul le gérant de cette tontine peut modifier l'ordre.
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    if (roleCode !== 'gerant') return res.status(403).json({ erreur: 'Réservé au gérant de la tontine' });

    // "?." évite une erreur si req.body est absent.
    const ordre = req.body?.ordre;
    // La liste doit exister, ne pas être vide, et ne contenir que des entiers supérieurs ou égaux à 1.
    if (!Array.isArray(ordre) || ordre.length === 0 || ordre.some((id) => !Number.isInteger(id) || id < 1)) {
      return res.status(400).json({ erreur: 'Liste d’ordre invalide' });
    }
    // Un Set ne garde que des valeurs uniques : si sa taille est plus petite, il y a un doublon.
    if (new Set(ordre).size !== ordre.length) {
      return res.status(400).json({ erreur: 'Un membre apparaît plusieurs fois' });
    }

    // Tout ce qui suit réussit ensemble ou est annulé ensemble.
    const resultat = await db.$transaction(async (transaction) => {
      // On relit la tontine à l'intérieur de la transaction.
      const tontine = await transaction.tontine.findUnique({ where: { id: tontineId }, select: { id: true, statut: true } });
      if (!tontine) return { erreur: 'Tontine introuvable', statut: 404 };
      // L'ordre n'est modifiable qu'avant le démarrage.
      if (tontine.statut !== 'en_preparation') return { erreur: 'Ordre figé : la tontine est démarrée', statut: 400 };

      // On relit les participants actuels : un ajout de membre a pu avoir lieu depuis la vérification du rôle.
      const participations = await transaction.participation.findMany({
        where: { tontineId },
        select: { utilisateurId: true },
      });
      const identifiantsAttendus = new Set(participations.map((participation) => participation.utilisateurId));

      // La liste reçue doit contenir exactement les participants : même nombre, et aucun inconnu.
      const listeComplete = participations.length === ordre.length
        && ordre.every((utilisateurId) => identifiantsAttendus.has(utilisateurId));
      if (!listeComplete) return { erreur: 'La liste doit contenir exactement les membres de la tontine', statut: 400 };

      // On écrit la position (1, 2, 3...) de chaque membre.
      for (const [index, utilisateurId] of ordre.entries()) {
        await transaction.participation.update({
          where: { utilisateurId_tontineId: { utilisateurId, tontineId } },
          data: { ordrePassage: index + 1 },
        });
      }

      // On renvoie l'ordre tel qu'il est maintenant enregistré.
      return { reponse: await construireOrdre(transaction, tontine) };
    }, { isolationLevel: 'Serializable' });

    // Si la transaction a signalé une erreur métier, on la traduit en réponse HTTP.
    if (resultat.erreur) return res.status(resultat.statut).json({ erreur: resultat.erreur });
    return res.json(resultat.reponse);
  } catch (err) {
    console.error('Erreur définition ordre :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de l’enregistrement de l’ordre de passage' });
  }
});

// ---------- Fonctions pour le calendrier des tours (fonctionnalité 4.2) ----------

// Calcule la date du tour numéro (decalage + 1) à partir de la date de début et de la fréquence.
function dateDuTour(dateDebut, frequence, decalage) {
  // Un jour en millisecondes : 24 heures x 60 minutes x 60 secondes x 1000.
  const unJour = 86400000;
  if (frequence === 'quotidien') return new Date(dateDebut.getTime() + decalage * unJour);
  if (frequence === 'hebdomadaire') return new Date(dateDebut.getTime() + decalage * 7 * unJour);
  // Mensuel : on calcule à partir de la date de début (pas du tour précédent) pour éviter la dérive 31 -> 28 -> 28.
  const annee = dateDebut.getUTCFullYear();
  const mois = dateDebut.getUTCMonth() + decalage;
  // Le jour 0 du mois suivant est le dernier jour de ce mois : on s'en sert pour ne pas dépasser (ex : 31 février).
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  return new Date(Date.UTC(annee, mois, Math.min(dateDebut.getUTCDate(), dernierJour)));
}

// Vérifie que les ordres de passage forment exactement 1, 2, 3 ... N (sans trou, sans doublon, sans vide).
function ordreEstComplet(participations) {
  // Un ordre vide (null) devient 0 dans le tri, puis ne correspond à aucune position et fait échouer le test.
  const ordres = participations.map((participation) => participation.ordrePassage).sort((a, b) => a - b);
  return ordres.every((ordre, index) => ordre === index + 1);
}

// Lit la tontine et ses tours pour fabriquer la réponse commune au GET et au POST.
async function construireCalendrier(client, tontineId) {
  const tontine = await client.tontine.findUnique({ where: { id: tontineId }, select: { id: true, statut: true, dateDebut: true } });
  // Une tontine introuvable est signalée par null.
  if (!tontine) return null;
  const tours = await client.tour.findMany({
    where: { tontineId },
    orderBy: { numero: 'asc' },
    select: {
      id: true, numero: true, datePrevue: true, montantCagnotte: true, statut: true, dateRemise: true,
      // Le bénéficiaire est une participation : on descend jusqu'au compte pour avoir son nom.
      beneficiaire: { select: { utilisateur: { select: { id: true, nom: true, photo: true } } } },
    },
  });
  // "slice(0, 10)" garde seulement AAAA-MM-JJ d'une date complète.
  const enTexte = (date) => (date ? date.toISOString().slice(0, 10) : null);
  // Le tour en cours est celui dont le statut est "en_cours" (null s'il n'y en a pas).
  const tourEnCours = tours.find((tour) => tour.statut === 'en_cours');
  return {
    tontine_id: tontine.id,
    statut: tontine.statut,
    date_debut: enTexte(tontine.dateDebut),
    tour_en_cours: tourEnCours ? tourEnCours.numero : null,
    tours: tours.map((tour) => ({
      tour_id: tour.id,
      numero: tour.numero,
      date_prevue: enTexte(tour.datePrevue),
      montant_cagnotte: tour.montantCagnotte,
      statut: tour.statut,
      date_remise: enTexte(tour.dateRemise),
      beneficiaire: tour.beneficiaire
        ? { utilisateur_id: tour.beneficiaire.utilisateur.id, nom: tour.beneficiaire.utilisateur.nom, photo: tour.beneficiaire.utilisateur.photo }
        : null,
    })),
  };
}

// GET /api/tontines/:id/tours : tout participant voit le calendrier des tours.
router.get('/:id/tours', async (req, res) => {
  try {
    const tontineId = lireIdentifiant(req.params.id);
    if (!tontineId) return res.status(400).json({ erreur: 'Identifiant invalide' });
    // Seul un participant a un rôle ici.
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    if (!roleCode) return res.status(403).json({ erreur: 'Vous ne participez pas à cette tontine' });
    const calendrier = await construireCalendrier(db, tontineId);
    if (!calendrier) return res.status(404).json({ erreur: 'Tontine introuvable' });
    return res.json(calendrier);
  } catch (err) {
    console.error('Erreur lecture calendrier :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors de la lecture du calendrier' });
  }
});

// POST /api/tontines/:id/demarrer : le gérant lance la tontine et génère tours et cotisations.
router.post('/:id/demarrer', async (req, res) => {
  try {
    const tontineId = lireIdentifiant(req.params.id);
    if (!tontineId) return res.status(400).json({ erreur: 'Identifiant invalide' });
    // Seul le gérant de cette tontine peut la démarrer.
    const roleCode = await verifierRole(req.utilisateurId, tontineId);
    if (roleCode !== 'gerant') return res.status(403).json({ erreur: 'Réservé au gérant de la tontine' });

    // La date de début doit être une vraie date, aujourd'hui ou plus tard.
    const dateDebut = lireDate(req.body?.date_debut);
    if (!dateDebut) return res.status(400).json({ erreur: 'Date de début invalide' });
    const aujourdhui = new Date();
    aujourdhui.setUTCHours(0, 0, 0, 0);
    if (dateDebut < aujourdhui) return res.status(400).json({ erreur: 'La date de début ne peut pas être dans le passé' });

    // Tout réussit ensemble ou est annulé ensemble : jamais de tontine "active" sans tours.
    const resultat = await db.$transaction(async (transaction) => {
      const tontine = await transaction.tontine.findUnique({
        where: { id: tontineId },
        select: { id: true, statut: true, frequence: true, montantCotisation: true, nombreMembres: true },
      });
      if (!tontine) return { erreur: 'Tontine introuvable', statut: 404 };
      // Une tontine ne démarre qu'une seule fois.
      if (tontine.statut !== 'en_preparation') return { erreur: 'La tontine est déjà démarrée', statut: 409 };

      // On relit les participants dans la transaction : un ajout simultané ne peut pas fausser le calcul.
      const participations = await transaction.participation.findMany({ where: { tontineId }, select: { id: true, ordrePassage: true } });
      if (participations.length !== tontine.nombreMembres) return { erreur: 'Tous les membres doivent être inscrits avant le démarrage', statut: 400 };
      if (!ordreEstComplet(participations)) return { erreur: 'L’ordre de passage doit être défini avant le démarrage', statut: 400 };

      // Les participants rangés dans l'ordre de passage : le premier de la liste reçoit au tour 1.
      const parOrdre = [...participations].sort((a, b) => a.ordrePassage - b.ordrePassage);
      // Cagnotte attendue = nombre de membres x montant de la cotisation (".mul" multiplie un Decimal sans erreur d'arrondi).
      const cagnotte = tontine.montantCotisation.mul(participations.length);

      // La tontine passe à "actif" avec sa date de début.
      await transaction.tontine.update({ where: { id: tontineId }, data: { statut: 'actif', dateDebut } });

      // Un tour par membre, puis une cotisation par membre pour chaque tour.
      for (const [index, beneficiaire] of parOrdre.entries()) {
        const datePrevue = dateDuTour(dateDebut, tontine.frequence, index);
        const tour = await transaction.tour.create({
          data: {
            tontineId,
            beneficiaireId: beneficiaire.id,
            numero: index + 1,
            datePrevue,
            montantCagnotte: cagnotte,
            // Le premier tour est en cours, les autres sont à venir.
            statut: index === 0 ? 'en_cours' : 'a_venir',
          },
          select: { id: true },
        });
        // createMany insère toutes les cotisations de ce tour en une seule requête.
        await transaction.cotisation.createMany({
          data: parOrdre.map((payeur) => ({
            participationId: payeur.id,
            tourId: tour.id,
            montant: tontine.montantCotisation,
            dateEcheance: datePrevue,
            statut: 'non_paye',
          })),
        });
      }

      // On renvoie le calendrier tel qu'il vient d'être enregistré.
      return { reponse: { message: 'Tontine démarrée', ...(await construireCalendrier(transaction, tontineId)) } };
    }, { isolationLevel: 'Serializable', timeout: 15000 });

    // Si la transaction a signalé une erreur métier, on la traduit en réponse HTTP.
    if (resultat.erreur) return res.status(resultat.statut).json({ erreur: resultat.erreur });
    return res.status(201).json(resultat.reponse);
  } catch (err) {
    // P2034 : deux démarrages simultanés se sont croisés, le second est refusé proprement.
    if (err.code === 'P2034') return res.status(409).json({ erreur: 'Une autre opération est en cours, réessayez' });
    console.error('Erreur démarrage tontine :', err.message);
    return res.status(500).json({ erreur: 'Erreur serveur lors du démarrage de la tontine' });
  }
});

// Le routeur est branché sous /api/tontines par server.js.
module.exports = router;