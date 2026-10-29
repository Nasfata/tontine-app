// useState garde l'état de focus du bouton.
import { useState } from 'react';
// Les composants natifs rendent le bouton et son chargement.
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
// Les couleurs, espacements et rayons viennent du thème commun.
import { couleurs, espacements, rayons, taillesTexte } from '../theme';

// Ces propriétés décrivent l'action, son apparence et ses états.
type BoutonProps = { titre: string; chargement?: boolean; desactive?: boolean; erreur?: boolean; variante?: 'principal' | 'secondaire' | 'danger'; onPress: () => void };

// Cette table garde un bon contraste texte/fond selon la variante :
// blanc sur bleu nuit, bleu nuit sur blanc, BLANC sur rouge (avant : rouge sur rouge, donc invisible).
const couleursTexte = { principal: couleurs.carte, secondaire: couleurs.principal, danger: couleurs.carte };

// Bouton applique le thème et signale chargement, erreur et désactivation.
export function Bouton({ titre, chargement = false, desactive = false, erreur = false, variante = 'principal', onPress }: BoutonProps) {
  // Le bouton désactivé ne déclenche pas une seconde action.
  const estDesactive = chargement || desactive;
  // Cet état indique visuellement un focus clavier ou tactile.
  const [estActif, setEstActif] = useState(false);
  // Pressable utilise ses événements pour rester compatible avec Expo SDK 57.
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: estDesactive, busy: chargement }} disabled={estDesactive} onFocus={() => setEstActif(true)} onBlur={() => setEstActif(false)} onPress={onPress} style={({ pressed }) => [styles.bouton, styles[variante], erreur && styles.bordureErreur, estActif && styles.focus, pressed && !estDesactive && styles.appuye, estDesactive && styles.desactive]}>
    {/* L'indicateur remplace le texte pendant le traitement, avec la même couleur lisible. */}
    {chargement ? <ActivityIndicator color={couleursTexte[variante]} /> : <Text numberOfLines={1} style={[styles.texte, { color: couleursTexte[variante] }]}>{titre}</Text>}
  </Pressable>;
}

// Les styles utilisent uniquement les valeurs du thème partagé.
const styles = StyleSheet.create({
  // Le bouton est large et haut ; flexGrow: 1 lui fait partager la largeur dans une ligne.
  bouton: { flexGrow: 1, minHeight: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacements.moyen, paddingVertical: 16, borderRadius: rayons.carte, borderWidth: 1 },
  // L'action principale utilise le bleu nuit.
  principal: { backgroundColor: couleurs.principal, borderColor: couleurs.principal },
  // L'action secondaire reste blanche et contourée.
  secondaire: { backgroundColor: couleurs.carte, borderColor: couleurs.bordure },
  // L'action de danger est rouge.
  danger: { backgroundColor: couleurs.erreur, borderColor: couleurs.erreur },
  // Le focus clavier est signalé par une bordure accentuée.
  focus: { borderColor: couleurs.accent, borderWidth: 2 },
  // Une erreur renforce la bordure avec la couleur dédiée.
  bordureErreur: { borderColor: couleurs.erreurFormulaire },
  // La désactivation réduit légèrement la présence visuelle.
  desactive: { opacity: 0.55 },
  // L'état pressé apporte un retour visuel simple.
  appuye: { opacity: 0.82 },
  // Taille et graisse du texte ; la couleur est fixée selon la variante ci-dessus.
  texte: { fontSize: taillesTexte.corps, fontWeight: '700' },
});