// Ce service valide les empreintes et construit les suggestions de contacts.
const crypto = require('crypto');
const depotContacts = require('../depots/contacts.depot');
const { normaliserTelephone } = require('../utils/telephone');
const { ErreurMetier } = require('../erreurs/erreursMetier');

// Cette fonction contrôle les droits et compare les empreintes sans exposer les téléphones.
async function rechercherCorrespondances(utilisateurId, tontineId, empreintesRecues) {
  if (typeof tontineId !== 'string' || !/^\d+$/.test(tontineId) || Number(tontineId) < 1) {
    throw new ErreurMetier('Un paramètre tontineId valide est requis', 400);
  }
  const roleCode = await depotContacts.trouverRoleParticipation(utilisateurId, tontineId);
  if (roleCode !== 'gerant') throw new ErreurMetier('Seul le gérant peut consulter les suggestions de membres', 403);
  if (!Array.isArray(empreintesRecues) || empreintesRecues.length > 500) {
    throw new ErreurMetier('Envoyez au maximum 500 empreintes par requête', 400);
  }
  if (empreintesRecues.some((empreinte) => typeof empreinte !== 'string' || !/^[a-f0-9]{64}$/i.test(empreinte))) {
    throw new ErreurMetier('Une ou plusieurs empreintes sont invalides', 400);
  }
  if (empreintesRecues.length === 0) return [];
  const empreintes = new Set(empreintesRecues.map((empreinte) => empreinte.toLowerCase()));
  const utilisateurs = await depotContacts.listerUtilisateursEligibles(utilisateurId, tontineId);
  const correspondances = utilisateurs.filter((utilisateur) => {
    const telephone = normaliserTelephone(utilisateur.telephone);
    if (!telephone) return false;
    return empreintes.has(crypto.createHash('sha256').update(telephone).digest('hex'));
  }).map(({ id, nom, photo }) => ({ id, nom, photo }));
  return correspondances;
}

// Le contrôleur de contacts appelle cette seule opération métier.
module.exports = { rechercherCorrespondances };
