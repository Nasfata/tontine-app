// React Native fournit les éléments visuels partagés par le bandeau et les pages.
import { Image, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
// Expo Router permet de revenir à l'écran précédent sans changer les routes.
import { router } from 'expo-router';
// Ionicons fournit les pictogrammes de retour et de déconnexion.
import { Ionicons } from '@expo/vector-icons';
// API_URL complète l'adresse des photos renvoyées avec un chemin relatif.
import { API_URL } from '../config';
// Le thème centralise les couleurs, espacements et rayons du guide.
import { couleurs, espacements, rayons, taillesTexte } from '../theme';

// Ces propriétés couvrent le bandeau principal et les en-têtes de page.
type EnTeteProps = ViewProps & {
  // Le titre sert aux pages et de nom par défaut au bandeau principal.
  titre: string;
  // Le mode principal affiche l'identité, le sous-titre et la déconnexion.
  mode?: 'page' | 'principal';
  // Le sous-titre complète l'identité dans le bandeau principal.
  sousTitre?: string;
  // La photo est facultative et laisse place à une initiale si elle manque.
  avatar?: string | null;
  // Cette action facultative remplace l'ouverture du profil au toucher.
  surAvatar?: () => void;
  // Le parent gère la confirmation avant de fermer la session.
  onDeconnexion?: () => void;
  // Le bouton retour n'apparaît que sur les pages secondaires.
  retour?: boolean;
  // Un élément facultatif peut compléter un en-tête de page.
  droite?: React.ReactNode;
};

// EnTete affiche un grand bandeau d'identité ou un petit titre de page.
export function EnTete({ titre, mode = 'page', sousTitre, avatar, onDeconnexion, surAvatar, retour = false, droite, style, ...proprietes }: EnTeteProps) {
  // L'affichage principal reprend le bandeau sombre observé sur la capture.
  if (mode === 'principal') {
    // Le nom et son initiale restent utilisables même sans photo de profil.
    const initiale = titre.trim().charAt(0).toLocaleUpperCase('fr-FR') || '?';
    // Le bandeau inclut avatar, identité, sous-titre et action de session.
    return <View {...proprietes} style={[styles.bandeau, style]}>
      {/* La photo ou l'initiale identifie la personne connectée. */}
            {/* L'avatar est cliquable : il ouvre l'écran Profil (ou l'action fournie). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir mon profil"
        onPress={surAvatar ?? (() => router.push('/profil'))}
        style={({ pressed }) => pressed && styles.appuye}
      >
        {avatar ? <Image source={{ uri: avatar.startsWith('http') ? avatar : `${API_URL}${avatar}` }} style={styles.avatar} resizeMode="cover" /> : <View style={styles.avatarInitiale}><Text style={styles.initiale}>{initiale}</Text></View>}
      </Pressable>
      {/* Le bloc de texte prend toute la place entre l'avatar et le bouton. */}
      <View style={styles.identite}>
        <Text numberOfLines={1} style={styles.nom}>{titre}</Text>
        {!!sousTitre && <Text numberOfLines={1} style={styles.sousTitre}>{sousTitre}</Text>}
      </View>
      {/* Le parent ouvre sa confirmation avant d'appeler la déconnexion. */}
      {!!onDeconnexion && <Pressable accessibilityRole="button" accessibilityLabel="Se déconnecter" onPress={onDeconnexion} style={({ pressed }) => [styles.deconnexion, pressed && styles.appuye]}><Ionicons name="log-out-outline" size={22} color={couleurs.carte} /></Pressable>}
    </View>;
  }
  // Les écrans secondaires gardent une barre de titre compacte.
  return <View {...proprietes} style={[styles.entetePage, style]}>
    {/* Le retour conserve une cible tactile adaptée au téléphone. */}
    {retour && <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.retour}><Ionicons name="arrow-back" size={22} color={couleurs.principal} /></Pressable>}
    {/* Le titre occupe l'espace disponible dans la ligne. */}
    <Text numberOfLines={2} style={styles.titrePage}>{titre}</Text>
    {/* Le contenu droit reste facultatif pour les pages secondaires. */}
    {droite}
  </View>;
}

// Ces styles reprennent les dimensions de l'en-tête des captures.
const styles = StyleSheet.create({
  // Le bandeau s'étire à la largeur de la fenêtre et arrondit ses coins bas.
  bandeau: { width: '100%', minHeight: 136, flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 18, paddingHorizontal: espacements.grand, borderBottomLeftRadius: rayons.grand, borderBottomRightRadius: rayons.grand, backgroundColor: couleurs.principal },
  // La photo conserve la taille et les arrondis du logo du guide.
  avatar: { width: 46, height: 46, marginRight: 12, borderRadius: rayons.petit, backgroundColor: couleurs.carte },
  // L'initiale remplace proprement l'image absente.
  avatarInitiale: { width: 46, height: 46, marginRight: 12, justifyContent: 'center', alignItems: 'center', borderRadius: rayons.petit, backgroundColor: couleurs.blancTranslucide },
  // Le nom reste blanc et fortement marqué sur le fond nuit.
  initiale: { color: couleurs.carte, fontSize: 20, fontWeight: '800' },
  // Les textes d'identité peuvent se réduire sans pousser le bouton.
  identite: { flex: 1, marginRight: espacements.petit },
  // Le nom correspond à la taille d'en-tête décrite dans le guide.
  nom: { color: couleurs.carte, fontSize: 17, fontWeight: '800' },
  // Le sous-titre est volontairement plus discret que le nom.
  sousTitre: { marginTop: 2, color: couleurs.texteEntete, fontSize: taillesTexte.petit },
  // Le bouton rond est translucide comme celui de la capture.
  deconnexion: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: rayons.cercle, backgroundColor: couleurs.blancTranslucide },
  // Le retour d'appui est visible sans changer les couleurs.
  appuye: { opacity: 0.7 },
  // La barre page reste simple lorsque le grand bandeau n'est pas demandé.
  entetePage: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: espacements.moyen },
  // La cible de retour est carrée pour rester facile à toucher.
  retour: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  // Le titre de page suit les styles d'en-tête du thème.
  titrePage: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: '800' },
});
