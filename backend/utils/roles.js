// Le pool MySQL partagé sert à vérifier l'appartenance à une tontine.
const db = require('../db');

// Cette fonction renvoie le rôle de la personne ou null si elle n'est pas membre.
async function verifierRole(utilisateurId, tontineId) {
  // La requête paramétrée évite toute injection SQL.
  const [lignes] = await db.query(
    'SELECT role_code FROM Participation WHERE utilisateur_id = ? AND tontine_id = ?',
    [utilisateurId, tontineId]
  );
  // Une ligne trouvée contient le rôle propre à cette tontine.
  return lignes.length > 0 ? lignes[0].role_code : null;
}

// La fonction peut être réutilisée par les autres routes du backend.
module.exports = { verifierRole };
