// React Native fournit le champ compatible avec les plateformes ciblées.
import { useState } from 'react';
// Les composants natifs affichent le libellé, l'erreur et la saisie.
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
// Ionicons signale les champs obligatoires et les erreurs de validation.
import { Ionicons } from '@expo/vector-icons';
// Le thème centralise les couleurs, espacements et arrondis.
import { couleurs, espacements, rayons, taillesTexte } from '../theme';

// Ces propriétés ajoutent un libellé et un état d'erreur au champ natif.
type ChampTexteProps = TextInputProps & { label: string; erreur?: string; obligatoire?: boolean };

// ChampTexte affiche un libellé, un champ et un retour d'erreur facultatif.
export function ChampTexte({ label, erreur, obligatoire = false, style, editable = true, onFocus, onBlur, ...proprietes }: ChampTexteProps) {
  // Cet état permet de mettre en valeur le champ au clavier ou au toucher.
  const [estActif, setEstActif] = useState(false);
  // Le conteneur conserve un espacement uniforme entre libellé et champ.
  return <View style={styles.conteneur}>
    {/* Le label aide à identifier le champ même après saisie. */}
    <Text style={styles.label}>{label}{obligatoire && <Text style={styles.etoile}> *</Text>}</Text>
    {/* Les propriétés natives restent personnalisables par chaque écran. */}
    <TextInput {...proprietes} editable={editable} onFocus={(evenement) => { setEstActif(true); onFocus?.(evenement); }} onBlur={(evenement) => { setEstActif(false); onBlur?.(evenement); }} accessibilityState={{ disabled: !editable }} style={[styles.champ, estActif && styles.focus, !!erreur && styles.champErreur, !editable && styles.desactive, style]} placeholderTextColor={couleurs.texteAttenue} />
    {/* Le message apparaît sous le champ quand une erreur est fournie. */}
    {!!erreur && <View accessibilityRole="alert" style={styles.ligneErreur}><Ionicons name="alert-circle" size={14} color={couleurs.erreurFormulaire} /><Text style={styles.erreur}>{erreur}</Text></View>}
  </View>;
}

// Les styles définissent l'apparence des états dans toutes les vues.
const styles = StyleSheet.create({
  // Les champs sont séparés verticalement dans le formulaire.
  conteneur: { gap: espacements.petit },
  // Le label est lisible sur le fond blanc de la carte.
  label: { color: couleurs.texteSecondaire, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  // Le champ offre une zone de saisie confortable sur toutes les plateformes.
  champ: { minHeight: 48, paddingHorizontal: espacements.moyen, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: rayons.moyen, backgroundColor: couleurs.fondChamp, color: couleurs.texte, fontSize: taillesTexte.corps },
  // Le focus clavier ou tactile devient visible avec l'accent doré.
  focus: { borderColor: couleurs.bordure },
  // Une erreur rend le contour rouge sans masquer le contenu saisi.
  champErreur: { borderColor: couleurs.erreurFormulaire, backgroundColor: couleurs.rougeClair },
  // Un champ non modifiable est légèrement atténué.
  desactive: { backgroundColor: couleurs.fond, opacity: 0.7 },
  // Le message d'erreur est placé directement sous sa saisie.
  erreur: { color: couleurs.erreurFormulaire, fontSize: taillesTexte.petit },
  // L'astérisque rouge distingue les valeurs obligatoires.
  etoile: { color: couleurs.erreurFormulaire },
  // L'icône et le texte d'erreur sont alignés sur une seule ligne.
  ligneErreur: { flexDirection: 'row', alignItems: 'center', gap: espacements.minuscule },
});
