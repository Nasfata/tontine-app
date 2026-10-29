// React Native fournit la pastille tactile et son libellé.
import { Pressable, StyleSheet, Text } from 'react-native';
// Le thème centralise les tons de la pastille active et inactive.
import { couleurs, espacements, rayons } from '../theme';

// Ces propriétés décrivent une pastille de filtre.
type PastilleProps = { titre: string; active: boolean; onPress: () => void };

// Pastille rend l'état actif explicite et conserve une grande cible tactile.
export function Pastille({ titre, active, onPress }: PastilleProps) {
  // La pastille peut être activée par toucher, clavier ou lecteur d'écran.
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.pastille, active && styles.active, pressed && styles.appuye]}>
    {/* Le libellé blanc ne s'affiche que sur la pastille active. */}
    <Text style={[styles.texte, active && styles.texteActif]}>{titre}</Text>
  </Pressable>;
}

// Ces styles reprennent la forme pilule du sélecteur de statut.
const styles = StyleSheet.create({
  // La pastille inactive a une surface blanche et une bordure fine.
  pastille: { minHeight: 42, justifyContent: 'center', paddingHorizontal: espacements.moyen, paddingVertical: espacements.petit, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: rayons.pilule, backgroundColor: couleurs.carte },
  // Le filtre choisi utilise le bleu nuit et le texte blanc.
  active: { borderColor: couleurs.principal, backgroundColor: couleurs.principal },
  // Le texte inactif reste gris foncé et lisible.
  texte: { color: couleurs.texteSecondaire, fontSize: 13, fontWeight: '700' },
  // Le texte actif contraste avec le fond bleu nuit.
  texteActif: { color: couleurs.carte },
  // L'opacité fournit un retour immédiat à la pression.
  appuye: { opacity: 0.7 },
});
