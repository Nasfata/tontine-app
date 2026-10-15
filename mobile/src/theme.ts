// Ce fichier centralise les couleurs utilisées dans toutes les vues.
export const couleurs = {
  // Le bleu nuit porte les actions principales et les titres.
  principal: '#0F2A43',
  // L'ambre met en évidence les actions et les rôles de gérant.
  accent: '#C8963E',
  // Le fond chaud adoucit l'ensemble de l'application.
  fond: '#F7F5F0',
  // Le blanc distingue les cartes du fond général.
  carte: '#FFFFFF',
  // Le vert signale une opération réussie.
  succes: '#1F8A5B',
  // Le rouge signale une erreur.
  erreur: '#C23B3B',
  // Le gris doux sert aux textes secondaires et aux bordures.
  secondaire: '#788592',
  // Le bleu pâle différencie les badges des membres.
  bleuClair: '#E8EEF3',
  // Le doré pâle accompagne l'accent.
  ambreClair: '#F5EBD8',
  // Le vert pâle accompagne les confirmations.
  vertClair: '#E4F2EB',
  // Le rouge pâle accompagne les messages d'erreur.
  rougeClair: '#F8E7E7',
  // La bordure claire structure les champs et séparations.
  bordure: '#E4E1DA',
};

// Ces valeurs règlent les espacements selon une échelle uniforme.
export const espacements = { tresPetit: 4, petit: 8, moyen: 16, grand: 24, tresGrand: 32 };

// Les rayons gardent les cartes et les commandes accueillantes.
export const rayons = { petit: 10, moyen: 16, grand: 20, pilule: 999 };

// Ces ombres restent discrètes sur iOS, Android et le web.
export const ombres = {
  // La carte gagne un léger relief sans bord lourd.
  carte: { shadowColor: '#0F2A43', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
};

// Ces tailles définissent les niveaux de texte de l'application.
export const taillesTexte = { petit: 12, secondaire: 14, corps: 16, sousTitre: 20, titre: 28, grandTitre: 34 };
