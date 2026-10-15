// Ces dictionnaires évitent d'afficher les codes techniques de la base.
const statuts: Record<string, string> = { en_preparation: 'En préparation', actif: 'Active', termine: 'Terminée', terminée: 'Terminée', annule: 'Annulée', annulee: 'Annulée' };
// Les rôles sont traduits en libellés simples.
const roles: Record<string, string> = { gerant: 'Gérant', membre: 'Membre' };
// Les fréquences sont accordées au féminin dans les interfaces.
const frequences: Record<string, string> = { quotidien: 'Quotidienne', hebdomadaire: 'Hebdomadaire', mensuel: 'Mensuelle' };

// Cette fonction traduit un statut et rend lisible toute valeur inconnue.
export function libelleStatut(valeur?: string) { return valeur ? statuts[valeur.toLowerCase()] ?? valeur.replaceAll('_', ' ') : 'Statut inconnu'; }
// Cette fonction traduit un rôle sans afficher son code technique.
export function libelleRole(valeur?: string) { return valeur ? roles[valeur.toLowerCase()] ?? 'Membre' : 'Membre'; }
// Cette fonction traduit une fréquence avec une valeur de repli lisible.
export function libelleFrequence(valeur?: string) { return valeur ? frequences[valeur.toLowerCase()] ?? valeur.replaceAll('_', ' ') : 'Fréquence inconnue'; }
// Ce formateur ajoute le séparateur de milliers français aux montants.
export function formaterMontant(valeur: number | string) { return `${new Intl.NumberFormat('fr-FR').format(Number(valeur) || 0)} FCFA`; }
