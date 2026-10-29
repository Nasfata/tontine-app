// React Native positionne le bouton flottant au-dessus de l'écran.
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
// Ionicons donne un signe plus similaire à celui de la capture.
import { Ionicons } from '@expo/vector-icons';
// Le thème définit la couleur sombre, le cercle et l'ombre du FAB.
import { couleurs, ombres, rayons } from '../theme';

// Ces propriétés décrivent l'action flottante.
type BoutonFlottantProps = { onPress: () => void; etiquette?: string; style?: StyleProp<ViewStyle> };

// BoutonFlottant place une action ronde au-dessus de la navigation basse.
export function BoutonFlottant({ onPress, etiquette = 'Créer une tontine', style }: BoutonFlottantProps) {
  // La taille et l'ombre reprennent précisément le bouton de création du guide.
  return <Pressable accessibilityRole="button" accessibilityLabel={etiquette} onPress={onPress} style={({ pressed }) => [styles.bouton, style, pressed && styles.appuye]}>
    {/* L'icône blanche conserve une bonne lisibilité sur fond foncé. */}
    <Ionicons name="add" size={30} color={couleurs.carte} />
  </Pressable>;
}

// Ces styles fixent le bouton en bas à droite de son écran parent.
const styles = StyleSheet.create({
  // Le cercle reste au-dessus de la barre d'onglets.
  bouton: { 
     position: 'absolute', right: 28, bottom: 24,
     width: 58, height: 58, justifyContent: 'center',
     alignItems: 'center', borderRadius: rayons.cercle,
     backgroundColor: couleurs.principal, shadowColor: couleurs.ombre,
     shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, 
     shadowRadius: 12, elevation: 8 },
  // Une opacité brève confirme l'appui sans animation externe.
  appuye: { opacity: 0.75 },
});
