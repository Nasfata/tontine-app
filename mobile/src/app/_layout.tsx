// React fournit l'effet de redirection après la restauration de session.
import { useEffect } from 'react';
// Expo Router gère les écrans et les changements d'URL.
import { Stack, useRouter, useSegments } from 'expo-router';
// React Native affiche un indicateur compatible avec les plateformes mobiles et web.
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
// AuthProvider fournit la session à tous les écrans.
import { AuthProvider, useAuth } from '../AuthContext';
// Les styles d'application utilisent la palette centrale.
import { couleurs } from '../theme';

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
  return <View style={styles.conteneur}><Stack screenOptions={{ headerShown: false, contentStyle: styles.contenu }}>
    {/* Les routes publiques gardent un affichage sans onglets. */}
    <Stack.Screen name="index" />
    <Stack.Screen name="connexion" />
    <Stack.Screen name="inscription" />
    {/* Le groupe porte les trois onglets tout en gardant leurs URL visibles actuelles. */}
    <Stack.Screen name="(onglets)" />
    {/* Ces écrans s'empilent au-dessus des onglets avec un bouton retour natif. */}
    <Stack.Screen name="tontines/[id]" options={{ headerShown: true, title: 'Détail de la tontine', headerStyle: styles.entete, headerTintColor: couleurs.principal, headerTitleStyle: styles.titreEntete }} />
    {/* L'ajout d'un membre s'ouvre lui aussi au-dessus des onglets. */}
    <Stack.Screen name="tontines/ajouter-membre" options={{ headerShown: true, title: 'Ajouter un membre', headerStyle: styles.entete, headerTintColor: couleurs.principal, headerTitleStyle: styles.titreEntete }} />
  </Stack></View>;
}

// Le fournisseur enveloppe toute l'application avant le navigateur.
export default function RootLayout() {
  // Les écrans peuvent utiliser le même contexte d'authentification.
  return <AuthProvider><NavigationAuthentifiee /></AuthProvider>;
}

// Ces styles centrent l'interface web dans une largeur proche d'un téléphone.
const styles = StyleSheet.create({
  // La vue occupe l'écran et centre les navigateurs, surtout sur le web.
  conteneur: { flex: 1, width: '100%', alignItems: 'center', backgroundColor: couleurs.fond },
  // Le contenu du navigateur reste fluide et ne dépasse pas 480 pixels sur le web.
  contenu: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, alignSelf: 'center', backgroundColor: couleurs.fond },
  // L'en-tête des écrans secondaires reprend le fond chaud du thème.
  entete: { backgroundColor: couleurs.fond },
  // Le titre des écrans secondaires garde une hiérarchie sobre.
  titreEntete: { color: couleurs.principal, fontWeight: '700' },
});
