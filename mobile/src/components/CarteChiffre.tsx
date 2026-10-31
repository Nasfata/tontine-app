// React Native affiche le contenu de la carte de statistique.
import { StyleSheet, Text, View } from 'react-native';
// Ionicons ajoute un repère visuel au chiffre présenté.
import { Ionicons } from '@expo/vector-icons';
// Le thème définit les couleurs, tailles, rayons et ombres partagés.
import { couleurs, espacements, ombres, rayons } from '../theme';

// Ces propriétés décrivent un indicateur de synthèse de l'accueil.
type CarteChiffreProps = { titre: string; valeur: string | number; icone: React.ComponentProps<typeof Ionicons>['name']; variante?: 'sombre' | 'succes' | 'claire'; };

// CarteChiffre rend un chiffre lisible dans une tuile colorée et compacte.
export function CarteChiffre({ titre, valeur, icone, variante = 'claire' }: CarteChiffreProps) {
  return <View style={[styles.carte, styles[variante]]}>
    {/* L'icône est placée à gauche pour gagner en hauteur. */}
    <Ionicons name={icone} size={20} color={variante === 'claire' ? couleurs.succes : couleurs.carte} />
    {/* La valeur et le libellé sont empilés à droite de l'icône. */}
    <View style={styles.texte}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.valeur, variante === 'claire' && styles.valeurClaire]}>{valeur}</Text>
      <Text numberOfLines={1} style={[styles.titre, variante === 'claire' && styles.titreClaire]}>{titre}</Text>
    </View>
  </View>;
}

// Ces règles gardent une grille souple avec des cartes basses.
const styles = StyleSheet.create({
  // La carte est en ligne, avec un padding vertical réduit.
  carte: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: espacements.petit, paddingVertical: 10, paddingHorizontal: 12, borderRadius: rayons.carte, ...ombres.carte },
  // Le bloc de texte prend la place restante à côté de l'icône.
  texte: { flex: 1 },
  sombre: { backgroundColor: couleurs.principal },
  succes: { backgroundColor: couleurs.succes },
  claire: { backgroundColor: couleurs.carte },
  // La valeur est un peu plus petite pour réduire la hauteur.
  valeur: { color: couleurs.carte, fontSize: 18, fontWeight: '900' },
  valeurClaire: { color: couleurs.succes },
  titre: { color: couleurs.texteEntete, fontSize: 11, fontWeight: '600' },
  titreClaire: { color: couleurs.texteAttenue },
});