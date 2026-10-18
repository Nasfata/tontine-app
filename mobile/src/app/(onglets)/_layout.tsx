// Expo Router crée une barre d'onglets native et compatible web.
import { Tabs } from 'expo-router';
// Ionicons fournit les pictogrammes des trois destinations principales.
import { Ionicons } from '@expo/vector-icons';
// React Native fournit les styles de la barre du bas.
import { Platform, StyleSheet, Text, View } from 'react-native';
// Les couleurs et tailles viennent du thème partagé.
import { couleurs, taillesTexte } from '../../theme';

// Ce layout affiche les trois sections principales de l'application.
export default function OngletsLayout() {
  // Les options partagées donnent à la barre un aspect cohérent sur web et mobile.
  return <View style={styles.conteneur}><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: couleurs.principal, tabBarInactiveTintColor: couleurs.inactif, tabBarStyle: styles.barre, tabBarLabelStyle: styles.libelle, sceneStyle: styles.scene }}>
    {/* Le premier onglet présente les tontines de l'utilisateur. */}
    <Tabs.Screen name="accueil" options={{ title: 'Tontines', tabBarLabel: ({ focused, color }) => <Text style={[styles.libelle, { color, fontWeight: focused ? '800' : '600' }]}>Tontines</Text>, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={22} /> }} />
    {/* Le groupe dédié conserve l'adresse /tontines/creer et forme un onglet unique. */}
    <Tabs.Screen name="(creation)" options={{ title: 'Créer', tabBarLabel: ({ focused, color }) => <Text style={[styles.libelle, { color, fontWeight: focused ? '800' : '600' }]}>Créer</Text>, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} color={color} size={22} /> }} />
    {/* Le profil reste accessible en permanence dans la barre du bas. */}
    <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarLabel: ({ focused, color }) => <Text style={[styles.libelle, { color, fontWeight: focused ? '800' : '600' }]}>Profil</Text>, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={22} /> }} />
  </Tabs></View>;
}

// La barre reste sur toute la largeur, comme sur les captures.
const styles = StyleSheet.create({
  // Ce conteneur garantit une hauteur utilisable au navigateur d'onglets.
  conteneur: { flex: 1, height: Platform.OS === 'web' ? '100%' : undefined, width: '100%', backgroundColor: couleurs.fond },
  // La barre suit la hauteur et la bordure supérieure du guide visuel.
  barre: { height: 110, paddingTop: 6, paddingBottom: 8, backgroundColor: couleurs.carte, borderTopWidth: 1, borderTopColor: couleurs.separateur, width: '100%' },
  // Les libellés sont petits mais lisibles et jamais forcés en capitales.
  libelle: { fontSize: taillesTexte.petit, fontWeight: '600' },
  // Chaque écran d'onglet reprend le fond commun.
  scene: { backgroundColor: couleurs.fond },
});
