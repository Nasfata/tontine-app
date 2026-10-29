// Cette fonction retire les séparateurs courants sans supprimer un + initial.
function normaliserTelephone(telephone) {
  // Une valeur autre qu'une chaîne ne peut pas représenter un numéro exploitable.
  if (typeof telephone !== 'string') return '';
  // Les espaces, points et tirets sont retirés pour comparer un format canonique.
  return telephone.trim().replace(/[\s.-]/g, '');
}

// Les routes partagent la même règle de normalisation.
module.exports = { normaliserTelephone };
