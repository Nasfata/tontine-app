// Ce layout Expo Router conserve l'ecran d'accueil dans son groupe de routes.
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { couleurs, taillesTexte } from '../../theme';

// L'accueil reste dans un navigateur d'onglets sans afficher de barre en doublon.
export default function OngletsLayout() {
  return <View style={styles.conteneur}><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: couleurs.principal, tabBarInactiveTintColor: couleurs.inactif, tabBarStyle: { display: 'none' }, tabBarLabelStyle: styles.libelle, sceneStyle: styles.scene }}>
    <Tabs.Screen name="accueil" options={{ title: 'Tontines', tabBarLabel: ({ focused, color }) => <Text style={[styles.libelle, { color, fontWeight: focused ? '800' : '600' }]}>Tontines</Text>, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={typeof color === 'string' ? color : couleurs.principal} size={22} /> }} />
  </Tabs></View>;
}

// Ces dimensions reprennent l'espace prevu pour les ecrans et leur fond.
const styles = StyleSheet.create({
  conteneur: { flex: 1, height: Platform.OS === 'web' ? '100%' : undefined, width: '100%', backgroundColor: couleurs.fond },
  barre: { height: 110, paddingTop: 6, paddingBottom: 8, backgroundColor: couleurs.carte, borderTopWidth: 1, borderTopColor: couleurs.separateur, width: '100%' },
  libelle: { fontSize: taillesTexte.petit, fontWeight: '600' },
  scene: { backgroundColor: couleurs.fond },
});