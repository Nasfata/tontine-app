// React Native fournit le champ compatible avec les plateformes ciblées.
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

// Ces propriétés ajoutent un libellé aux options natives de TextInput.
type ChampTexteProps = TextInputProps & { label: string };

// ChampTexte affiche un libellé et un champ de saisie cohérent.
export function ChampTexte({ label, style, ...proprietes }: ChampTexteProps) {
  // Le conteneur conserve un espacement uniforme entre libellé et champ.
  return <View style={styles.conteneur}>
    {/* Le label aide à identifier le champ même après saisie. */}
    <Text style={styles.label}>{label}</Text>
    {/* Les propriétés natives restent personnalisables par chaque écran. */}
    <TextInput {...proprietes} style={[styles.champ, style]} placeholderTextColor="#8292A5" />
  </View>;
}

// Les styles définissent les couleurs, bordures et espacements communs.
const styles = StyleSheet.create({
  // Les champs sont séparés verticalement dans le formulaire.
  conteneur: { gap: 7 },
  // Le label est lisible sur le fond blanc de la carte.
  label: { color: '#263B50', fontSize: 14, fontWeight: '600' },
  // Le champ offre une zone de saisie confortable sur mobile.
  champ: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D5DEE8', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#16324F', fontSize: 16 },
});
