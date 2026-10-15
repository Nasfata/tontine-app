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
  // On identifie la route courante à partir des segments Expo Router.
  const pageActuelle = segments[0];
  // La connexion et l'inscription sont accessibles sans session.
  const pagePublique = pageActuelle === 'connexion' || pageActuelle === 'inscription';
  // On redirige seulement après la lecture du stockage local.
  useEffect(() => {
    // Aucun changement de route n'est fait pendant le chargement initial.
    if (chargement) return;
    // Un utilisateur connecté ne doit pas rester sur une page publique.
    if (utilisateur && pagePublique) router.replace('/accueil');
    // Un visiteur conserve l'accès aux pages publiques.
    if (!utilisateur && !pagePublique) router.replace('/connexion');
  }, [chargement, utilisateur, pagePublique, segments, router]);
  // Le démarrage attend la lecture du stockage local.
  if (chargement) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  // Les routes sont déclarées explicitement dans le navigateur Expo Router.
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /><Stack.Screen name="connexion" /><Stack.Screen name="inscription" /><Stack.Screen name="accueil" /><Stack.Screen name="profil" /></Stack>;
}

// Le fournisseur enveloppe toute l'application avant le navigateur.
export default function RootLayout() {
  // Les écrans peuvent utiliser le même contexte d'authentification.
  return <AuthProvider><NavigationAuthentifiee /></AuthProvider>;
}
