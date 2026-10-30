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
// La navigation du bas reste disponible sur chaque écran connecté.
import MenuBas from '../components/MenuBas';
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
    if (!demarrageEnCours) {
      const remiseAZero = setTimeout(() => setChargementProlonge(false), 0);
      return () => clearTimeout(remiseAZero);
    }
    const temporisateur = setTimeout(() => setChargementProlonge(true), 10_000);
    return () => clearTimeout(temporisateur);
  }, [demarrageEnCours]);

  // Seul le navigateur en développement désinscrit les service workers et caches.
  useEffect(() => {
    if (Platform.OS !== 'web' || !__DEV__) return;
    let composantActif = true;
    void desinstallerServiceWorker().finally(() => { if (composantActif) setNettoyageTermine(true); });
    return () => { composantActif = false; };
  }, []);

  // On identifie la route courante à partir des segments Expo Router.
  const pageActuelle = segments[0];
  const pagePublique = pageActuelle === 'connexion' || pageActuelle === 'inscription';
  const afficherMenu = Boolean(utilisateur) && !pagePublique;
  const sectionActive = pageActuelle === 'profil' ? 'profil' : 'tontines';

  // On redirige seulement après la lecture du stockage local.
  useEffect(() => {
    if (chargement || !nettoyageTermine) return;
    if (utilisateur && pagePublique) router.replace('/accueil');
    if (!utilisateur && !pagePublique) router.replace('/connexion');
  }, [chargement, nettoyageTermine, utilisateur, pagePublique, segments, router]);

  // Le démarrage attend la lecture du stockage local.
  if (demarrageEnCours) return <View style={styles.chargement}>
    <ActivityIndicator size="large" color={couleurs.accent} />
    <Text style={styles.messageChargement}>Chargement...</Text>
    {chargementProlonge && <Text accessibilityRole="alert" style={styles.messageChargement}>Le démarrage prend plus de 10 secondes. Vérifiez la console du navigateur, puis rechargez la page.</Text>}
  </View>;

  // La barre est placée sous la pile afin de rester visible sur chaque page connectée.
  return <View style={styles.conteneur}>
    <View style={styles.colonne}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="connexion" />
        <Stack.Screen name="inscription" />
        <Stack.Screen name="(onglets)" />
        <Stack.Screen name="tontines/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profil" options={{ headerShown: false }} />
        <Stack.Screen name="tontines/creer" options={{ presentation: 'transparentModal', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="tontines/ajouter-membre" options={{ presentation: 'transparentModal', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
      </Stack>
    </View>
    {afficherMenu && <MenuBas sectionActive={sectionActive} />}
  </View>;
}

// Le fournisseur enveloppe toute l'application avant le navigateur.
export default function RootLayout() {
  return <AuthProvider><NavigationAuthentifiee /></AuthProvider>;
}

// Ces styles laissent l'application occuper toute la largeur du navigateur.
const styles = StyleSheet.create({
  conteneur: { flex: 1, width: '100%', alignItems: 'stretch', backgroundColor: couleurs.fond },
  colonne: { flex: 1, width: '100%', backgroundColor: couleurs.fond },
  chargement: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: couleurs.fond },
  messageChargement: { maxWidth: 420, marginTop: 20, paddingHorizontal: 24, color: couleurs.secondaire, textAlign: 'center' },
});
