// Expo Router conserve la page de création dans la navigation de l'onglet.
import { Stack } from 'expo-router';

// Ce navigateur interne garde une pile simple pour la route de création.
export default function CreationLayout() {
  // L'écran de création occupe l'onglet sans ajouter un en-tête en double.
  return <Stack screenOptions={{ headerShown: false }} />;
}
