// Fonctions de validation partagées par toutes les routes.

// Convertit un texte de l'adresse (ex : "4") en entier positif, ou renvoie null s'il est invalide.
function lireIdentifiant(valeur) {
  // Number("4") donne 4, mais Number("abc") donne NaN (pas un nombre).
  const nombre = Number(valeur);
  // On n'accepte que les entiers supérieurs ou égaux à 1.
  return Number.isInteger(nombre) && nombre >= 1 ? nombre : null;
}

// Convertit un texte "2026-11-30" en date (minuit UTC), ou renvoie null si ce n'est pas une vraie date.
function lireDate(texte) {
  // Le texte doit avoir exactement la forme AAAA-MM-JJ.
  if (typeof texte !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texte)) return null;
  const date = new Date(`${texte}T00:00:00.000Z`);
  // JavaScript "corrige" une date impossible comme 2026-02-30 : on la détecte en comparant au texte d'origine.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== texte) return null;
  return date;
}

// Renvoie aujourd'hui à minuit (UTC) : sert à savoir si une échéance est dépassée.
function debutDeJournee() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

module.exports = { lireIdentifiant, lireDate, debutDeJournee };