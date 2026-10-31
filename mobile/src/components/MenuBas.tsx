// Cette barre garde les destinations principales accessibles sur chaque écran connecté.
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { couleurs } from '../theme';

// Ces valeurs indiquent quelle destination est sélectionnée.
type SectionMenu = 'tontines' | 'profil';

// Le menu reçoit la section active déterminée par le layout racine.
export default function MenuBas({ sectionActive }: { sectionActive: SectionMenu }) {
  const router = useRouter();

  // Chaque bouton ouvre la page principale correspondante.
  function ouvrirTontines() {
    router.navigate('/accueil');
  }

  function ouvrirProfil() {
    router.navigate('/profil');
  }

  return (
    <View style={styles.barre}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: sectionActive === 'tontines' }}
        style={styles.destination}
        activeOpacity={0.7}
        onPress={ouvrirTontines}
      >
        <Ionicons name={sectionActive === 'tontines' ? 'people' : 'people-outline'} size={22} color={sectionActive === 'tontines' ? couleurs.principal : couleurs.inactif} />
        <Text style={[styles.libelle, sectionActive === 'tontines' && styles.libelleActif]}>Tontines</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: sectionActive === 'profil' }}
        style={styles.destination}
        activeOpacity={0.7}
        onPress={ouvrirProfil}
      >
        <Ionicons name={sectionActive === 'profil' ? 'person' : 'person-outline'} size={22} color={sectionActive === 'profil' ? couleurs.principal : couleurs.inactif} />
        <Text style={[styles.libelle, sectionActive === 'profil' && styles.libelleActif]}>Profil</Text>
      </TouchableOpacity>
    </View>
  );
}

// Ces styles reprennent la barre blanche et le séparateur du guide visuel.
const styles = StyleSheet.create({
  barre: {
    height: 110,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'web' ? 8 : 24,
    borderTopWidth: 1,
    borderTopColor: couleurs.separateur,
    backgroundColor: couleurs.carte,
  },
  destination: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 52 },
  libelle: { color: couleurs.inactif, fontSize: 11, fontWeight: '600' },
  libelleActif: { color: couleurs.principal, fontWeight: '800' },
});
