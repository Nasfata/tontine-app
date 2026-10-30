// Ce service transmet la demande de diagnostic au dépôt.
const depotDiagnostic = require('../depots/diagnostic.depot');

// Cette fonction retourne les rôles sans connaître Express.
async function lireRoles() {
  return depotDiagnostic.listerRoles();
}

// Le contrôleur de diagnostic importe ces opérations métier.
module.exports = { lireRoles };
