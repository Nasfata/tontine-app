// Expo Router conserve la page de création dans la navigation de l'onglet.
import { Stack } from 'expo-router';
// React Native donne une hauteur explicite au navigateur imbriqué sur le web.
import { Platform, StyleSheet, View } from 'react-native';

// Ce navigateur interne garde une pile simple pour la route de création.
export default function CreationLayout() {
  // L'écran de création occupe l'onglet sans ajouter un en-tête en double.
  return <View style={styles.conteneur}><Stack screenOptions={{ headerShown: false }} /></View>;
}

// Cette vue remplit la hauteur de l'onglet qui contient la création.
const styles = StyleSheet.create({
  // Le navigateur de création hérite de la hauteur complète sur le web.
  conteneur: { flex: 1, height: Platform.OS === 'web' ? '100%' : undefined, width: '100%' },
});
