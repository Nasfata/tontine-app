// React Native fournit une fenêtre modale compatible avec web et mobile.
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';
// Ionicons dessine le bouton de fermeture de la feuille.
import { Ionicons } from '@expo/vector-icons';
// Le thème regroupe les couleurs et les formes de la feuille.
import { couleurs, espacements, ombres, rayons } from '../theme';

// Ces propriétés composent le contenu d'une feuille modale réutilisable.
type FeuilleModaleProps = ViewProps & { visible: boolean; titre: string; onFermer: () => void; children: React.ReactNode; pied?: React.ReactNode };

// FeuilleModale monte le formulaire depuis le bas avec un voile de fond.
export function FeuilleModale({ visible, titre, onFermer, children, pied, style, ...proprietes }: FeuilleModaleProps) {
  // La fenêtre native garde le geste de fermeture attendu sur chaque plateforme.
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onFermer} statusBarTranslucent>
    {/* Le voile ferme la fenêtre quand l'utilisateur touche à l'extérieur. */}
    <View style={styles.ecran}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fenêtre" onPress={onFermer} style={styles.voile} />
      {/* Le panneau est collé en bas et garde une largeur lisible sur ordinateur. */}
      <View style={[styles.feuille, style]}>
        {/* Le titre et le bouton X restent visibles au-dessus du défilement. */}
        <View style={styles.entete}>
          <Text numberOfLines={1} style={styles.titre}>{titre}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onFermer} style={styles.fermer}><Ionicons name="close" size={24} color={couleurs.texteAttenue} /></Pressable>
        </View>
        {/* Le contenu peut défiler lorsque le clavier ou la fenêtre est petit. */}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenu}>
          <View {...proprietes}>{children}</View>
        </ScrollView>
        {/* Le bouton principal reste en pied de feuille si l'écran le fournit. */}
        {!!pied && <View style={styles.pied}>{pied}</View>}
      </View>
    </View>
  </Modal>;
}

// Ces styles reprennent l'arrondi haut, le voile et les espaces du formulaire client.
const styles = StyleSheet.create({
  // Le conteneur ancre la feuille au bas de la fenêtre.
  ecran: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  // Le voile assombrit le contenu situé derrière la feuille.
  voile: { ...StyleSheet.absoluteFill, backgroundColor: couleurs.voileModale },
  // La feuille peut couvrir presque tout l'écran sans étirement horizontal.
  feuille: { width: '100%', maxWidth: 1100, maxHeight: '92%', alignSelf: 'center', overflow: 'hidden', borderTopLeftRadius: rayons.grand, borderTopRightRadius: rayons.grand, backgroundColor: couleurs.carte, ...ombres.carte },
  // Le titre et le bouton de fermeture occupent une rangée fixe.
  entete: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: espacements.grand, paddingRight: espacements.petit, borderBottomWidth: 1, borderBottomColor: couleurs.separateur },
  // Le titre reprend la graisse forte des panneaux modaux.
  titre: { flex: 1, color: couleurs.texte, fontSize: 22, fontWeight: '800' },
  // Le contrôle X reste facile à toucher.
  fermer: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  // Le contenu garde la marge visible sur les captures.
  contenu: { padding: espacements.grand, gap: espacements.moyen },
  // Le pied garde le bouton principal près du bord inférieur.
  pied: { paddingHorizontal: espacements.grand, paddingBottom: espacements.grand, paddingTop: espacements.petit, borderTopWidth: 1, borderTopColor: couleurs.separateur },
});
