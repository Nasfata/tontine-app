// Ce fichier rassemble les tokens visuels du guide InvoiceEase.
export const couleurs = {
  // Le bleu marine est la couleur principale des actions et titres.
  principal: '#0B2C4D',
  // Le bleu moyen complète la couleur principale.
  secondaireMarque: '#1E5F8C',
  // Le bleu vif sert aux actions secondaires et aux liens.
  accent: '#3478F6',
  // Le fond pâle donne une base calme aux écrans.
  fond: '#F7F8FA',
  // Le panneau de saisie est légèrement teinté.
  fondChamp: '#F5F7FA',
  // Les cartes restent blanches.
  carte: '#FFFFFF',
  // Le vert signale une réussite.
  succes: '#1A9D54',
  // Le fond vert accompagne un état réussi.
  vertClair: '#E6F7ED',
  // Le rouge signale une erreur ou une suppression.
  erreur: '#E0473E',
  // Le rouge formulaire suit la nuance dédiée du guide.
  erreurFormulaire: '#DC2626',
  // Le fond rouge accompagne un champ en erreur.
  rougeClair: '#FEF2F2',
  // La bordure standard structure champs et cartes.
  bordure: '#E8ECF0',
  // Le séparateur est plus discret que la bordure.
  separateur: '#F0F1F3',
  // Le texte principal reste presque noir.
  texte: '#1A1A1A',
  // Le texte secondaire décrit les champs et actions.
  texteSecondaire: '#555555',
  // Le texte atténué sert aux aides et placeholders.
  texteAttenue: '#999999',
  // L'orange porte l'état en attente.
  attente: '#D98B14',
  // Le fond orange accompagne l'état en attente.
  attenteClair: '#FFF3E0',
  // Les surfaces secondaires utilisent un gris presque blanc.
  panneau: '#FAFBFC',
  // Les contrôles inactifs de navigation sont gris.
  inactif: '#9CA3AF',
  // Le blanc translucide sert sur les surfaces principales.
  blancTranslucide: 'rgba(255,255,255,0.18)',
  // Le blanc très translucide sert aux détails d'en-tête.
  blancAttenue: 'rgba(255,255,255,0.7)',
  // Le noir fournit la teinte des ombres.
  ombre: '#000000',
  // Le gris de validation garde une coche discrète.
  gris: '#CCCCCC',
  // Ces noms historiques gardent les écrans compatibles pendant la refonte.
  secondaire: '#555555',
  // Ce ton pâle reste utilisé comme surface de badge existante.
  bleuClair: '#F5F7FA',
  // Cet alias accompagne encore le badge de rôle existant.
  ambreClair: '#FFF3E0',
};

// Ces espacements reprennent les mesures usuelles du guide.
export const espacements = { tresPetit: 4, petit: 8, moyen: 14, grand: 20, tresGrand: 32 };

// Ces rayons reprennent les formes des contrôles et cartes.
export const rayons = { tresPetit: 8, petit: 10, moyen: 12, carte: 16, grand: 24, pilule: 20 };

// La police système native est utilisée sans chargement externe.
export const typographie = { meta: 10, aide: 12, libelle: 13, corps: 15, valeur: 16, titreCarte: 18, titreAuth: 26 };

// Ces tailles maintiennent une échelle cohérente dans les écrans.
export const taillesTexte = { petit: typographie.aide, secondaire: typographie.libelle, corps: typographie.corps, sousTitre: typographie.titreCarte, titre: typographie.titreAuth, grandTitre: 26 };

// Les cartes ont une ombre légère comme dans le guide visuel.
export const ombres = {
  // L'ombre courte relève les surfaces sans alourdir l'écran.
  carte: { shadowColor: couleurs.ombre, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
};
