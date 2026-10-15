// React Native affiche le badge et son libellé.
import { StyleSheet, Text, View } from 'react-native';
// Le thème et les libellés partagés définissent l'apparence et le texte.
import { couleurs, rayons, taillesTexte } from '../theme';
import { libelleRole, libelleStatut } from '../libelles';

// Ces propriétés distinguent les badges de rôle et de statut.
type BadgeProps = { valeur: string; type: 'role' | 'statut' };

// Badge traduit le code et adapte la couleur à sa catégorie.
export function Badge({ valeur, type }: BadgeProps) {
  // Les gérants sont dorés et les membres bleu nuit.
  const estGerant = type === 'role' && valeur.toLowerCase() === 'gerant';
  // Le rôle ou statut reçoit un texte français lisible.
  const libelle = type === 'role' ? libelleRole(valeur) : libelleStatut(valeur);
  // Le badge prend l'accent doré pour le gérant et le bleu pour les autres.
  return <View style={[styles.base, estGerant ? styles.gerant : styles.normal]}><Text style={[styles.texte, estGerant ? styles.texteGerant : styles.texteNormal]}>{libelle}</Text></View>;
}

// Ces règles gardent un format compact et accessible.
const styles = StyleSheet.create({
  // La forme pilule différencie le badge des cartes.
  base: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: rayons.pilule },
  // Le rôle de gérant est mis en valeur avec un fond ambre doux.
  gerant: { backgroundColor: couleurs.ambreClair },
  // Les rôles membres et statuts utilisent un fond bleu pâle.
  normal: { backgroundColor: couleurs.bleuClair },
  // Le texte reste dense mais lisible.
  texte: { fontSize: taillesTexte.petit, fontWeight: '700' },
  // Le texte gérant reprend une teinte ambrée soutenue.
  texteGerant: { color: couleurs.accent },
  // Le texte standard reprend le bleu principal.
  texteNormal: { color: couleurs.principal },
});
