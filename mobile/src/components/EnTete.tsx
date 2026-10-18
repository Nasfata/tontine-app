// React Native fournit les éléments de l'en-tête et le bouton retour.
import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
// Expo Router permet de revenir à l'écran précédent.
import { router } from 'expo-router';
// L'icône de retour est compatible avec le web et le mobile.
import { Ionicons } from '@expo/vector-icons';
// Le thème donne des valeurs visuelles communes.
import { couleurs, espacements, taillesTexte } from '../theme';

// Ces propriétés décrivent le titre et l'éventuel badge secondaire.
type EnTeteProps = ViewProps & { titre: string; retour?: boolean; droite?: React.ReactNode };

// EnTete présente un titre et un bouton de navigation facultatif.
export function EnTete({ titre, retour = false, droite, style }: EnTeteProps) {
  // Le bouton retour est affiché seulement lorsqu'il est demandé.
  return <View style={[styles.entete, style]}>
    {/* L'action retour reste facile à atteindre au doigt. */}
    {retour && <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.retour}><Ionicons name="arrow-back" size={22} color={couleurs.principal} /></Pressable>}
    {/* Le titre prend l'espace disponible. */}
    <Text numberOfLines={2} style={styles.titre}>{titre}</Text>
    {/* Le contenu droit est facultatif. */}
    {droite}
  </View>;
}

// Ces styles assurent un alignement compact et lisible.
const styles = StyleSheet.create({
  // L'en-tête aligne titre et retour sur une même ligne.
  entete: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: espacements.moyen },
  // La zone de retour est carrée et assez large pour le toucher.
  retour: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Le titre utilise la couleur et la hiérarchie principales.
  titre: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: '800' },
});
