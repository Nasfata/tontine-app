// React fournit l'effet de redirection après la restauration de session.
import { useEffect } from 'react';
// Expo Router gère les écrans et les changements d'URL.
import { Stack, useRouter, useSegments } from 'expo-router';
// React Native affiche un indicateur compatible avec les plateformes mobiles et web.
import { ActivityIndicator, View } from 'react-native';
// AuthProvider fournit la session à tous les écrans.
import { AuthProvider, useAuth } from '../AuthContext';

// Ce composant applique les règles d'accès aux routes.
function NavigationAuthentifiee() {
  // On lit l'état de session et la route actuellement affichée.
  const { utilisateur, chargement } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // On redirige vers la partie adaptée dès que le stockage a été lu.
  useEffect(() => {
    // Aucune redirection n'est faite avant de connaître l'état de session.
    if (chargement) return;
    // Les utilisateurs connectés sont dirigés vers l'accueil authentifié.
    if (utilisateur && segments[0] !== 'accueil') router.replace('/accueil');
    // Les visiteurs sont dirigés vers l'écran de connexion.
    if (!utilisateur && segments[0] !== 'connexion') router.replace('/connexion');
  }, [chargement, utilisateur, segments, router]);
  // Le démarrage attend la lecture du stockage local.
  if (chargement) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  // Les routes sont déclarées explicitement dans le navigateur Expo Router.
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /><Stack.Screen name="connexion" /><Stack.Screen name="accueil" /></Stack>;
}

// Le fournisseur enveloppe toute l'application avant le navigateur.
export default function RootLayout() {
  // Les écrans peuvent utiliser le même contexte d'authentification.
  return <AuthProvider><NavigationAuthentifiee /></AuthProvider>;
}
