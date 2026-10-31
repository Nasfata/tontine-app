// Ce contrôleur extrait les paramètres HTTP et délègue les cotisations au service ; la preuve est envoyée avec ses en-têtes de sécurité.
const serviceCotisations = require('../services/cotisations.service');

// Ce helper renvoie le statut de l'erreur métier, ou une erreur serveur avec le texte historique de la route.
function erreurServeur(res, erreur, journal, message) {
  if (erreur.statut) return res.status(erreur.statut).json({ erreur: erreur.message });
  console.error(journal, erreur.message);
  return res.status(500).json({ erreur: message });
}

// Cette fonction contrôle l'accès AVANT la lecture du fichier : un inconnu ne peut pas nous faire recevoir 5 Mo pour rien.
async function exigerParticipant(req, res, next) {
  try {
    req.acces = await serviceCotisations.controlerAcces(req.utilisateurId, req.params.id);
    return next();
  } catch (erreur) { return erreurServeur(res, erreur, 'Erreur contrôle d’accès :', 'Erreur serveur'); }
}

// Cette fonction renvoie la liste filtrée des cotisations.
async function listerCotisations(req, res) {
  try { return res.json(await serviceCotisations.listerCotisations(req.utilisateurId, req.acces, req.query)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur lecture cotisations :', 'Erreur serveur lors de la lecture des cotisations'); }
}

// Cette fonction enregistre la déclaration de paiement, avec le fichier reçu par le middleware.
async function declarerPaiement(req, res) {
  try { return res.json(await serviceCotisations.declarerPaiement(req.utilisateurId, req.acces, req.params.cotisationId, req.file)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur déclaration paiement :', 'Erreur serveur lors de la déclaration du paiement'); }
}

// Cette fonction envoie l'image de la preuve avec des en-têtes qui empêchent toute mise en cache ou interprétation.
async function lirePreuve(req, res) {
  try {
    const { octets, typeContenu } = await serviceCotisations.lirePreuve(req.utilisateurId, req.acces, req.params.cotisationId);
    res.set({
      'Content-Type': typeContenu,
      // Interdit au navigateur de "deviner" un autre type que celui annoncé.
      'X-Content-Type-Options': 'nosniff',
      // Une preuve de paiement ne doit être gardée dans aucun cache.
      'Cache-Control': 'private, no-store',
    });
    return res.send(octets);
  } catch (erreur) { return erreurServeur(res, erreur, 'Erreur lecture preuve :', 'Erreur serveur lors de la lecture de la preuve'); }
}

// Cette fonction enregistre la décision du gérant sur une déclaration de paiement.
async function validerPaiement(req, res) {
  try { return res.json(await serviceCotisations.decider(req.utilisateurId, req.acces, req.params.cotisationId, req.body)); }
  catch (erreur) { return erreurServeur(res, erreur, 'Erreur décision sur un paiement :', 'Erreur serveur lors de la décision sur le paiement'); }
}

// Le routeur associe ces actions aux chemins HTTP.
module.exports = { exigerParticipant, listerCotisations, declarerPaiement, lirePreuve, validerPaiement };