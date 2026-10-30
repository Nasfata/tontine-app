// React Native fournit une fenêtre modale compatible avec web et mobile.
import { Modal, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
// Ionicons dessine le bouton de fermeture de la feuille.
import { Ionicons } from '@expo/vector-icons';
// Le thème regroupe les couleurs et les formes de la feuille.
import { couleurs, espacements, ombres, rayons } from '../theme';

// Ces propriétés composent le contenu d'une feuille modale réutilisable.
// enRoute : à activer quand l'écran est déjà une modale d'Expo Router (presentation: 'transparentModal').
type FeuilleModaleProps = ViewProps & {
  visible: boolean;
  titre: string;
  onFermer: () => void;
  children: React.ReactNode;
  pied?: React.ReactNode;
  placement?: 'bas' | 'centre';
  enRoute?: boolean;
};

// FeuilleModale monte le formulaire depuis le bas avec un voile de fond.
export function FeuilleModale({ visible, titre, onFermer, children, pied, placement = 'bas', enRoute = false, style, ...proprietes }: FeuilleModaleProps) {
  // Le contenu visuel est identique avec ou sans fenêtre native.
  const corps = (
    <View style={[styles.ecran, placement === 'centre' && styles.ecranCentre]}>
      {/* Le voile ferme la fenêtre quand l'utilisateur touche à l'extérieur. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fenêtre" onPress={onFermer} style={styles.voile} />
      {/* Le panneau est collé en bas et garde une largeur lisible sur ordinateur. */}
      {/* En mode route, la feuille a une hauteur réelle pour que le formulaire puisse défiler. */}
      <View style={[styles.feuille, placement === 'centre' && styles.feuilleCentre, enRoute && styles.feuillePleine, style]}>
        {/* Le titre et le bouton X restent visibles au-dessus du défilement. */}
        <View style={styles.entete}>
          <Text numberOfLines={1} style={styles.titre}>{titre}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onFermer} style={styles.fermer}>
            <Ionicons name="close" size={24} color={couleurs.texteAttenue} />
          </Pressable>
        </View>
        {/* Le contenu gère lui-même son défilement selon le formulaire affiché. */}
        <View {...proprietes} style={[styles.contenu, enRoute && styles.contenuPlein]}>{children}</View>
        {/* Le bouton principal reste en pied de feuille si l'écran le fournit. */}
        {!!pied && <View style={styles.pied}>{pied}</View>}
      </View>
    </View>
  );

  // La route est déjà une modale : on n'ouvre pas un second Modal natif.
  if (enRoute) return corps;

  // La fenêtre native garde le geste de fermeture attendu sur chaque plateforme.
  return (
    <Modal
      visible={visible}
      transparent
      animationType={placement === 'centre' ? 'fade' : 'slide'}
      onRequestClose={onFermer}
      statusBarTranslucent
    >
      {corps}
    </Modal>
  );
}

// Ces styles reprennent l'arrondi haut, le voile et les espaces du formulaire client.
const styles = StyleSheet.create({
  // Le conteneur ancre la feuille au bas de la fenêtre.
  ecran: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  // Le mode confirmation centre le panneau sur le fond assombri.
  ecranCentre: { justifyContent: 'center', alignItems: 'center', padding: espacements.grand },
  // Le voile assombrit le contenu situé derrière la feuille.
  voile: { ...StyleSheet.absoluteFill, backgroundColor: couleurs.voileModale },
  // La feuille peut couvrir presque tout l'écran sans étirement horizontal.
  feuille: {
    width: '100%',
    maxWidth: 1100,
    maxHeight: '92%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: rayons.grand,
    borderTopRightRadius: rayons.grand,
    backgroundColor: couleurs.carte,
    ...ombres.carte,
  },
  // Une confirmation est plus compacte et arrondie sur ses quatre côtés.
  feuilleCentre: { width: '100%', maxWidth: 480, borderRadius: rayons.grand },
  // Hauteur fixe : indispensable sur mobile pour que flex: 1 fonctionne à l'intérieur.
  feuillePleine: { height: '92%' },
  // Le titre et le bouton de fermeture occupent une rangée fixe.
  entete: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: espacements.grand,
    paddingRight: espacements.petit,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.separateur,
  },
  // Le titre reprend la graisse forte des panneaux modaux.
  titre: { flex: 1, color: couleurs.texte, fontSize: 22, fontWeight: '800' },
  // Le contrôle X reste facile à toucher.
  fermer: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  // Le contenu peut se réduire pour laisser défiler un formulaire dans la feuille.
  contenu: { flexShrink: 1, minHeight: 0, padding: espacements.grand, gap: espacements.moyen },
  // En mode route, le contenu occupe tout l'espace sous l'en-tête, sans marge en double.
  contenuPlein: { flex: 1, padding: 0 },
  // Le pied garde le bouton principal près du bord inférieur.
  pied: {
    paddingHorizontal: espacements.grand,
    paddingBottom: espacements.grand,
    paddingTop: espacements.petit,
    borderTopWidth: 1,
    borderTopColor: couleurs.separateur,
  },
});
