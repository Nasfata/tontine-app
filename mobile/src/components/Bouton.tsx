// React Native fournit un bouton tactile et un indicateur multiplateforme.
import { useState } from 'react';
// Les composants natifs rendent le bouton et son chargement.
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
// Les couleurs, espacements et rayons viennent du thème commun.
import { couleurs, espacements, rayons, taillesTexte } from '../theme';

// Ces propriétés décrivent l'action, son apparence et ses états.
type BoutonProps = { titre: string; chargement?: boolean; desactive?: boolean; erreur?: boolean; variante?: 'principal' | 'secondaire' | 'danger'; onPress: () => void };

// Bouton applique le thème et signale chargement, erreur et désactivation.
export function Bouton({ titre, chargement = false, desactive = false, erreur = false, variante = 'principal', onPress }: BoutonProps) {
  // Le bouton désactivé ne déclenche pas une seconde action.
  const estDesactive = chargement || desactive;
  // Cet état indique visuellement un focus clavier ou tactile.
  const [estActif, setEstActif] = useState(false);
  // Pressable utilise ses événements pour rester compatible avec Expo SDK 57.
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: estDesactive, busy: chargement }} disabled={estDesactive} onFocus={() => setEstActif(true)} onBlur={() => setEstActif(false)} onPress={onPress} style={({ pressed }) => [styles.bouton, styles[variante], erreur && styles.bordureErreur, estActif && styles.focus, pressed && !estDesactive && styles.appuye, estDesactive && styles.desactive]}>
    {/* L'indicateur remplace le texte pendant le traitement. */}
    {chargement ? <ActivityIndicator color={couleursTexte[ variante ]} /> : <Text style={[styles.texte, variante !== 'principal' && { color: couleursTexte[variante] }]}>{titre}</Text>}
  </Pressable>;
}

// Les styles utilisent uniquement les valeurs du thème partagé.
const styles = StyleSheet.create({
  // Le bouton conserve au moins 52 pixels de hauteur tactile.
  bouton: { minHeight: 52, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacements.moyen, borderRadius: rayons.petit, borderWidth: 1 },
  // L'action principale utilise le bleu nuit.
  principal: { backgroundColor: couleurs.principal, borderColor: couleurs.principal },
  // L'action secondaire reste blanche et contourée.
  secondaire: { backgroundColor: couleurs.carte, borderColor: couleurs.bordure },
  // L'action de danger est rouge sans modifier les écrans existants.
  danger: { backgroundColor: couleurs.rougeClair, borderColor: couleurs.rougeClair },
  // Le focus clavier est signalé par une bordure accentuée.
  focus: { borderColor: couleurs.accent, borderWidth: 2 },
  // Une erreur renforce la bordure avec la couleur dédiée.
  bordureErreur: { borderColor: couleurs.erreur },
  // La désactivation réduit légèrement la présence visuelle.
  desactive: { opacity: 0.55 },
  // L'état pressé apporte un retour visuel simple.
  appuye: { opacity: 0.82 },
  // Le texte du bouton principal reste contrasté.
  texte: { color: couleurs.carte, fontSize: taillesTexte.corps, fontWeight: '700' },
  // Le texte secondaire reprend le bleu nuit.
  texteSecondaire: { color: couleurs.principal },
});

// Cette table garde un bon contraste selon l'apparence du bouton.
const couleursTexte = { principal: couleurs.carte, secondaire: couleurs.principal, danger: couleurs.erreur };
