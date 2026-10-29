// React Native fournit la saisie et la surface de recherche.
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
// Ionicons dessine la loupe de recherche.
import { Ionicons } from '@expo/vector-icons';
// Les couleurs et rayons viennent du thème central.
import { couleurs, espacements, ombres, rayons } from '../theme';

// Ces propriétés gardent les options standard de TextInput.
type BarreRechercheProps = TextInputProps;

// BarreRecherche affiche une recherche arrondie sous le bandeau.
export function BarreRecherche({ placeholder = 'Rechercher…', style, ...proprietes }: BarreRechercheProps) {
  // La loupe et le champ forment une seule surface claire.
  return <View style={styles.conteneur}>
    {/* L'icône indique la fonction sans ajouter de texte fixe. */}
    <Ionicons name="search-outline" size={20} color={couleurs.texteAttenue} />
    {/* Le champ transmet directement ses valeurs au parent. */}
    <TextInput {...proprietes} placeholder={placeholder} placeholderTextColor={couleurs.texteAttenue} style={[styles.champ, style]} />
  </View>;
}

// Ces règles reprennent la barre blanche arrondie de la capture.
const styles = StyleSheet.create({
  // Le conteneur garde une hauteur confortable et une ombre légère.
  conteneur: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: espacements.petit, paddingHorizontal: espacements.moyen, borderRadius: rayons.recherche, backgroundColor: couleurs.carte, ...ombres.carte },
  // Le texte saisissable remplit l'espace restant.
  champ: { flex: 1, minHeight: 48, padding: 0, color: couleurs.texte, fontSize: 15 },
});
