// React Native fournit un indicateur compatible avec toutes les plateformes.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
// Le thème règle la couleur et la taille du texte.
import { couleurs, taillesTexte } from '../theme';

// Chargement affiche un indicateur centré avec un texte facultatif.
export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  // L'indicateur décrit son activité aux utilisateurs.
  return <View accessibilityRole="progressbar" style={styles.contenu}><ActivityIndicator size="large" color={couleurs.accent} /><Text style={styles.texte}>{texte}</Text></View>;
}

// Ces styles alignent l'indicateur au milieu de l'espace disponible.
const styles = StyleSheet.create({
  // Le conteneur occupe l'écran et centre les éléments.
  contenu: { flex: 1, minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: couleurs.fond },
  // Le libellé reste en retrait visuel.
  texte: { color: couleurs.secondaire, fontSize: taillesTexte.secondaire },
});
