// React fournit l'effet de redirection après la restauration de session.
import { useEffect, useState } from 'react';
// Expo Router gère les écrans et les changements d'URL.
import { Stack, useRouter, useSegments } from 'expo-router';
// React Native affiche un indicateur compatible avec les plateformes mobiles et web.
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
// AuthProvider fournit la session à tous les écrans.
import { AuthProvider, useAuth } from '../AuthContext';
// Les styles d'application utilisent la palette centrale.
import { couleurs } from '../theme';
// Cette fonction retire les anciens mécanismes web uniquement en développement.
import { desinstallerServiceWorker } from '../desinstallerServiceWorker';

// Ce composant applique les règles d'accès aux routes.
function NavigationAuthentifiee() {
  // On lit l'état de session et la route actuellement affichée.
  const { utilisateur, chargement } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // Le web attend le nettoyage avant de lancer les appels des écrans.
  const [nettoyageTermine, setNettoyageTermine] = useState(!(Platform.OS === 'web' && __DEV__));
  // Cet état indique que le démarrage dépasse le délai prévu de dix secondes.
  const [chargementProlonge, setChargementProlonge] = useState(false);
  // Le chargement reste actif tant que la session ou le nettoyage n'est pas terminé.
  const demarrageEnCours = chargement || !nettoyageTermine;
  // Un message explicatif apparaît si l'une de ces opérations tarde trop.
  useEffect(() => {
    // Le délai est annulé dès que l'application est prête.
    if (!demarrageEnCours) {
      setChargementProlonge(false);
      return;
    }
    // On attend dix secondes avant d'afficher une aide à l'écran.
    const temporisateur = setTimeout(() => setChargementProlonge(true), 10_000);
    // On annule le délai lorsque l'état de démarrage change ou le composant est démonté.
    return () => clearTimeout(temporisateur);
  }, [demarrageEnCours]);
  // Seul le navigateur en développement désinscrit les service workers et caches.
  useEffect(() => {
    // Sur mobile ou en production, aucun nettoyage web n'est nécessaire.
    if (Platform.OS !== 'web' || !__DEV__) return;
    // Ce drapeau évite une mise à jour d'état après le démontage du layout.
    let composantActif = true;
    // Le nettoyage gère ses propres erreurs et permet ensuite l'affichage des écrans.
    void desinstallerServiceWorker().finally(() => { if (composantActif) setNettoyageTermine(true); });
    // On invalide le drapeau si l'écran racine est démonté.
    return () => { composantActif = false; };
  }, []);
  // On identifie la route courante à partir des segments Expo Router.
  const pageActuelle = segments[0];
  // La connexion et l'inscription sont accessibles sans session.
  const pagePublique = pageActuelle === 'connexion' || pageActuelle === 'inscription';
  // On redirige seulement après la lecture du stockage local.
  useEffect(() => {
    // Aucun changement de route n'est fait pendant le chargement initial.
    if (chargement || !nettoyageTermine) return;
    // Un utilisateur connecté ne doit pas rester sur une page publique.
    if (utilisateur && pagePublique) router.replace('/accueil');
    // Un visiteur conserve l'accès aux pages publiques.
    if (!utilisateur && !pagePublique) router.replace('/connexion');
  }, [chargement, nettoyageTermine, utilisateur, pagePublique, segments, router]);
  // Le démarrage attend la lecture du stockage local.
  if (demarrageEnCours) return <View style={styles.chargement}>
    {/* L'animation montre que la restauration ou le nettoyage travaille encore. */}
    <ActivityIndicator size="large" color={couleurs.accent} />
    {/* Le texte reste visible immédiatement pendant chaque attente de démarrage. */}
    <Text style={styles.messageChargement}>Chargement...</Text>
    {/* Le texte aide à diagnostiquer un démarrage qui ne se termine pas. */}
    {chargementProlonge && <Text accessibilityRole="alert" style={styles.messageChargement}>Le démarrage prend plus de 10 secondes. Vérifiez la console du navigateur, puis rechargez la page.</Text>}
  </View>;
  // Les routes Expo Router occupent maintenant toute la largeur disponible.
  return <View style={styles.conteneur}><View style={styles.colonne}><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="connexion" />
    <Stack.Screen name="inscription" />
    <Stack.Screen name="(onglets)" />
    {/* <Stack.Screen name="tontines/[id]" options={{ headerShown: false }} /> */}
    <Stack.Screen name="tontines/creer" options={{ presentation: 'transparentModal', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
    <Stack.Screen name="tontines/ajouter-membre" options={{ presentation: 'transparentModal', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
  </Stack></View></View>;
}

// Le fournisseur enveloppe toute l'application avant le navigateur.
export default function RootLayout() {
  // Les écrans peuvent utiliser le même contexte d'authentification.
  return <AuthProvider><NavigationAuthentifiee /></AuthProvider>;
}

// Ces styles laissent l'application occuper toute la largeur du navigateur.
const styles = StyleSheet.create({
  // Le conteneur remplit la fenêtre sur mobile et sur ordinateur.
  conteneur: { flex: 1, width: '100%', alignItems: 'stretch', backgroundColor: couleurs.fond },
  // La pile n'impose plus de colonne fixe sur grand écran.
  colonne: { flex: 1, width: '100%', backgroundColor: couleurs.fond },
  chargement: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: couleurs.fond },
  messageChargement: { maxWidth: 420, marginTop: 20, paddingHorizontal: 24, color: couleurs.secondaire, textAlign: 'center' },
});
