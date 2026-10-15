// React Native fournit un bouton tactile et un indicateur multiplateforme.
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

// Ces propriétés décrivent l'action et son état de chargement.
type BoutonProps = { titre: string; chargement?: boolean; onPress: () => void };

// Bouton fournit une apparence et un état occupé cohérents.
export function Bouton({ titre, chargement = false, onPress }: BoutonProps) {
  // Pressable est désactivé pendant l'envoi pour éviter les doublons.
  return <Pressable accessibilityRole="button" disabled={chargement} onPress={onPress} style={({ pressed }) => [styles.bouton, pressed && !chargement && styles.appuye]}>
    {/* L'indicateur remplace le texte pendant le traitement. */}
    {chargement ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.texte}>{titre}</Text>}
  </Pressable>;
}

// Les couleurs reprennent celles des formulaires d'authentification.
const styles = StyleSheet.create({
  // Le bouton garde une hauteur pratique pour les interactions tactiles.
  bouton: { minHeight: 50, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#1769AA' },
  // L'état pressé apporte un retour visuel simple.
  appuye: { opacity: 0.82 },
  // Le texte du bouton reste contrasté sur le fond bleu.
  texte: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
