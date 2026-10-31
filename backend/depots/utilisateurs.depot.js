// Ce dépôt regroupe les requêtes Prisma liées aux utilisateurs.
const prisma = require('../config/baseDeDonnees');

// Cette fonction recherche un compte par téléphone pour l'inscription.
async function trouverUtilisateurParTelephone(telephone) {
  return prisma.utilisateur.findUnique({ where: { telephone }, select: { id: true } });
}

// Cette fonction crée un compte sans retourner son hash au client.
async function creerUtilisateur(donnees) {
  return prisma.utilisateur.create({ data: donnees, select: { id: true } });
}

// Cette fonction retourne les informations nécessaires à la connexion.
async function trouverUtilisateurPourConnexion(telephone) {
  return prisma.utilisateur.findUnique({
    where: { telephone },
    select: { id: true, nom: true, telephone: true, photo: true, motDePasseHash: true },
  });
}

// Cette fonction lit les données publiques du profil.
async function trouverProfilParId(id) {
  return prisma.utilisateur.findUnique({
    where: { id },
    select: { id: true, nom: true, telephone: true, photo: true, dateCreation: true },
  });
}

// Cette fonction recherche un autre compte ayant le même numéro.
async function trouverDoublonTelephone(telephone, id) {
  return prisma.utilisateur.findFirst({ where: { telephone, id: { not: id } }, select: { id: true } });
}

// Cette fonction met à jour les informations principales du compte.
async function modifierProfil(id, donnees) {
  return prisma.utilisateur.update({ where: { id }, data: donnees });
}

// Cette fonction enregistre le chemin public de la nouvelle photo.
async function modifierPhoto(id, photo) {
  return prisma.utilisateur.update({ where: { id }, data: { photo } });
}

// Ces opérations sont partagées par les services auth, profil et contacts.
module.exports = { trouverUtilisateurParTelephone, creerUtilisateur, trouverUtilisateurPourConnexion, trouverProfilParId, trouverDoublonTelephone, modifierProfil, modifierPhoto };
