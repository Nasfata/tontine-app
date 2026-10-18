// React Native fournit le contenu de l'état vide.
import { StyleSheet, Text, View } from 'react-native';
// Une icône vectorielle donne un repère visuel simple.
import { Ionicons } from '@expo/vector-icons';
// Le thème fournit les couleurs et espacements.
import { couleurs, espacements, taillesTexte } from '../theme';
import { Bouton } from './Bouton';

// Les actions facultatives sont décrites avec leur titre et callback.
type ActionVide = { titre: string; action: () => void };
// Ces propriétés composent l'illustration et le message vide.
type EtatVideProps = { titre: string; texte: string; actions?: ActionVide[] };

// EtatVide affiche une explication et jusqu'à deux actions utiles.
export function EtatVide({ titre, texte, actions = [] }: EtatVideProps) {
  // Les actions sont rendues sans créer de style propre à chaque écran.
  return <View style={styles.contenu}>
    {/* L'icône évoque un groupe vide sans illustration complexe. */}
    <Ionicons name="people-outline" size={44} color={couleurs.accent} />
    {/* Le titre décrit l'état simplement. */}
    <Text style={styles.titre}>{titre}</Text>
    {/* Le texte propose le contexte ou l'étape suivante. */}
    <Text style={styles.texte}>{texte}</Text>
    {/* Chaque action utilise le composant bouton partagé. */}
    {actions.map((action, index) => <Bouton key={action.titre} titre={action.titre} variante={index ? 'secondaire' : 'principal'} onPress={action.action} />)}
  </View>;
}

// Ces styles laissent respirer le message et les commandes.
const styles = StyleSheet.create({
  // Le contenu est centré dans la carte d'état vide.
  contenu: { alignItems: 'center', gap: espacements.moyen, paddingVertical: espacements.grand },
  // Le titre reprend la hiérarchie générale.
  titre: { color: couleurs.texte, fontSize: taillesTexte.sousTitre, fontWeight: '700', textAlign: 'center' },
  // Le détail secondaire reste discret et centré.
  texte: { color: couleurs.texteSecondaire, fontSize: taillesTexte.corps, lineHeight: 24, textAlign: 'center' },
});
