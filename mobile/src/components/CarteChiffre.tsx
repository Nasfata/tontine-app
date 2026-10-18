// React Native affiche le contenu de la carte de statistique.
import { StyleSheet, Text, View } from 'react-native';
// Ionicons ajoute un repère visuel au chiffre présenté.
import { Ionicons } from '@expo/vector-icons';
// Le thème définit les couleurs, tailles, rayons et ombres partagés.
import { couleurs, espacements, ombres, rayons } from '../theme';

// Ces propriétés décrivent un indicateur de synthèse de l'accueil.
type CarteChiffreProps = { titre: string; valeur: string | number; icone: React.ComponentProps<typeof Ionicons>['name']; variante?: 'sombre' | 'succes' | 'claire'; };

// CarteChiffre rend un chiffre lisible dans une tuile colorée.
export function CarteChiffre({ titre, valeur, icone, variante = 'claire' }: CarteChiffreProps) {
  // La variante sombre ou verte suit les cartes visibles sur la capture.
  return <View style={[styles.carte, styles[variante]]}>
    {/* L'icône reste discrète au-dessus de la valeur principale. */}
    <Ionicons name={icone} size={20} color={variante === 'claire' ? couleurs.succes : couleurs.carte} />
    {/* La valeur reçoit la plus forte graisse de la carte. */}
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.valeur, variante === 'claire' && styles.valeurClaire]}>{valeur}</Text>
    {/* Le libellé explique la mesure affichée. */}
    <Text numberOfLines={2} style={[styles.titre, variante === 'claire' && styles.titreClaire]}>{titre}</Text>
  </View>;
}

// Ces règles gardent une grille souple sans étirer le contenu à l'infini.
const styles = StyleSheet.create({
  // La carte prend une cellule disponible et s'adapte à la largeur parente.
  carte: { flexGrow: 1, flexBasis: '45%', maxWidth: 560, minHeight: 132, justifyContent: 'space-between', gap: espacements.petit, padding: espacements.moyen, borderRadius: rayons.carte, ...ombres.carte },
  // La première tuile reprend le bleu nuit de la marque.
  sombre: { backgroundColor: couleurs.principal },
  // La deuxième tuile met une réussite en évidence en vert.
  succes: { backgroundColor: couleurs.succes },
  // Les autres mesures gardent une surface blanche.
  claire: { backgroundColor: couleurs.carte },
  // La valeur reste blanche sur les fonds colorés.
  valeur: { color: couleurs.carte, fontSize: 22, fontWeight: '900' },
  // La valeur sur fond blanc utilise le vert de la capture.
  valeurClaire: { color: couleurs.succes },
  // Le titre utilise un contraste secondaire sur les fonds colorés.
  titre: { color: couleurs.texteEntete, fontSize: 12, fontWeight: '600' },
  // Le libellé sur fond clair reste gris.
  titreClaire: { color: couleurs.texteAttenue },
});
