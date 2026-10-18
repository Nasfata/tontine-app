// Expo Router crée une barre d'onglets native et compatible web.
import { Tabs } from 'expo-router';
// Ionicons fournit les pictogrammes des trois destinations principales.
import { Ionicons } from '@expo/vector-icons';
// React Native fournit les styles de la barre du bas.
import { Platform, StyleSheet, View } from 'react-native';
// Les couleurs et tailles viennent du thème partagé.
import { couleurs, taillesTexte } from '../../theme';

// Ce layout affiche les trois sections principales de l'application.
export default function OngletsLayout() {
  // Les options partagées donnent à la barre un aspect cohérent sur web et mobile.
  return <View style={styles.conteneur}><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: couleurs.accent, tabBarInactiveTintColor: couleurs.secondaire, tabBarStyle: styles.barre, tabBarLabelStyle: styles.libelle, sceneStyle: styles.scene }}>
    {/* Le premier onglet présente les tontines de l'utilisateur. */}
    <Tabs.Screen name="accueil" options={{ title: 'Tontines', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
    {/* Le groupe dédié conserve l'adresse /tontines/creer et forme un onglet unique. */}
    <Tabs.Screen name="(creation)" options={{ title: 'Créer', tabBarIcon: (etat) => <Ionicons name="add-circle-outline" color={etat.color} size={etat.size} /> }} />
    {/* Le profil reste accessible en permanence dans la barre du bas. */}
    <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: (etat) => <Ionicons name="person-outline" color={etat.color} size={etat.size} /> }} />
  </Tabs></View>;
}

// La barre reste centrée et étroite sur le web, pleine largeur sur mobile.
const styles = StyleSheet.create({
  // Ce conteneur garantit une hauteur utilisable au navigateur d'onglets.
  conteneur: { flex: 1, height: Platform.OS === 'web' ? '100%' : undefined, width: '100%', backgroundColor: couleurs.fond },
  // La barre contraste avec le fond chaud et reste au bas de l'écran.
  barre: { height: Platform.OS === 'web' ? 64 : 72, paddingTop: 8, paddingBottom: 8, backgroundColor: couleurs.carte, borderTopColor: couleurs.bordure, maxWidth: Platform.OS === 'web' ? 480 : undefined, width: '100%', alignSelf: 'center' },
  // Les libellés sont petits mais lisibles et jamais forcés en capitales.
  libelle: { fontSize: taillesTexte.petit, fontWeight: '600' },
  // Chaque écran d'onglet reprend le fond commun.
  scene: { backgroundColor: couleurs.fond },
});
