// React gère le chargement des tontines et le message de demande d'ajout.
import { useEffect, useState } from 'react';
// React Native fournit les composants d'interface utilisables sur mobile et web.
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router fournit les liens et le type des destinations.
import { Link, type Href } from 'expo-router';
// Le contexte donne le profil courant et l'action de déconnexion.
import { useAuth } from '../AuthContext';
// appelerApi ajoute le jeton et fournit le statut HTTP en cas d'erreur.
import { appelerApi, ErreurApi } from '../api';

// Ce type couvre les champs attendus des tontines et leurs variantes usuelles.
type Tontine = { id: number | string; nom: string; role?: string; statut?: string };
// Ce type accepte une réponse directe ou enveloppée dans une propriété tontines.
type ReponseTontines = Tontine[] | { tontines?: Tontine[] };

// Cet écran affiche les tontines de l'utilisateur ou les actions de démarrage.
export default function Accueil() {
  // On lit le nom de l'utilisateur et son action de déconnexion.
  const { utilisateur, deconnexion } = useAuth();
  // Ces états contiennent les données et les retours de chargement.
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [afficherAide, setAfficherAide] = useState(false);
  // La liste est chargée une fois à l'ouverture de cet écran.
  useEffect(() => {
    // Ce drapeau évite une mise à jour après le démontage de l'écran.
    let actif = true;
    // La requête gère explicitement le cas où la route n'existe pas encore.
    async function chargerTontines() {
      try {
        // Le backend peut renvoyer la liste directement ou dans un objet.
        const resultat = await appelerApi<ReponseTontines>('/api/tontines');
        // On normalise les deux formats en une liste.
        const liste = Array.isArray(resultat) ? resultat : resultat.tontines ?? [];
        // Les résultats ne sont appliqués que si l'écran est toujours monté.
        if (actif) setTontines(liste);
      } catch (cause) {
        // Un 404 représente la route pas encore créée et équivaut temporairement à une liste vide.
        if (actif && cause instanceof ErreurApi && cause.statut === 404) setTontines([]);
        // Les autres erreurs restent visibles à l'utilisateur.
        else if (actif) setErreur(cause instanceof Error ? cause.message : 'Impossible de charger les tontines.');
      } finally {
        // L'écran quitte son état de chargement après la réponse.
        if (actif) setChargement(false);
      }
    }
    // On lance la lecture de la liste au montage.
    void chargerTontines();
    // On invalide les mises à jour si l'écran est démonté.
    return () => { actif = false; };
  }, []);
  // Le chargement évite d'afficher brièvement un état vide avant la réponse.
  if (chargement) return <View style={styles.centre}><ActivityIndicator size="large" color="#1769AA" /></View>;
  // L'écran présente les données en liste avec un accès permanent au profil.
  return <ScrollView contentContainerStyle={styles.contenu}>
    {/* L'en-tête accueille l'utilisateur et donne accès à son profil. */}
    <View style={styles.entete}>
      {/* Le nom personnalise le message de bienvenue. */}
      <View><Text style={styles.surtitre}>Bienvenue</Text><Text style={styles.titre}>{utilisateur?.nom ?? 'dans votre espace'}</Text></View>
      {/* Le profil est accessible depuis l'écran principal. */}
      <Link href={'/profil' as Href} asChild><Pressable style={styles.boutonSecondaire}><Text style={styles.texteSecondaire}>Mon profil</Text></Pressable></Link>
    </View>
    {/* Les erreurs autres que la route absente restent signalées. */}
    {!!erreur && <Text style={styles.erreur} accessibilityRole="alert">{erreur}</Text>}
    {/* Une liste vide affiche les actions de création ou de demande d'ajout. */}
    {tontines.length === 0 ? <View style={styles.carte}>
      {/* Le message explique que l'utilisateur n'a pas encore de groupe. */}
      <Text style={styles.titreCarte}>Bienvenue dans Tontine App</Text>
      <Text style={styles.texte}>Vous ne faites partie d'aucune tontine pour le moment.</Text>
      {/* Ce lien ouvre le futur formulaire de création de tontine. */}
      <Link href={'/tontines/creer' as Href} asChild><Pressable style={styles.boutonPrincipal}><Text style={styles.textePrincipal}>Créer une tontine</Text></Pressable></Link>
      {/* Ce bouton affiche l'explication de la procédure V1. */}
      <Pressable style={styles.boutonSecondaire} onPress={() => setAfficherAide(!afficherAide)}><Text style={styles.texteSecondaire}>Rejoindre une tontine</Text></Pressable>
      {/* L'explication apparaît après l'action Rejoindre. */}
      {afficherAide && <Text style={styles.aide}>Demande au gérant de t'ajouter avec ton numéro de téléphone</Text>}
    </View> : <View style={styles.liste}>
      {/* Le titre annonce les tontines auxquelles l'utilisateur appartient. */}
      <Text style={styles.titreSection}>Mes tontines</Text>
      {/* Chaque carte expose le nom, le rôle et le statut du groupe. */}
      {tontines.map((tontine) => <View key={tontine.id} style={styles.carteTontine}>
        {/* Le nom du groupe est mis en évidence. */}
        <Text style={styles.titreCarte}>{tontine.nom}</Text>
        {/* Le rôle est traduit en libellé lisible. */}
        <Text style={styles.texte}>Rôle : {tontine.role?.toLowerCase() === 'gerant' || tontine.role?.toLowerCase() === 'gérant' ? 'Gérant' : 'Membre'}</Text>
        {/* Le statut brut du backend est affiché, avec un texte de repli. */}
        <Text style={styles.texte}>Statut : {tontine.statut ?? 'Non précisé'}</Text>
      </View>)}
    </View>}
    {/* La déconnexion reste disponible sous le contenu principal. */}
    <Button title="Se déconnecter" color="#526579" onPress={() => void deconnexion()} />
  </ScrollView>;
}

// Les styles reprennent la palette commune des écrans d'authentification.
const styles = StyleSheet.create({
  // L'indicateur occupe et centre l'écran pendant la requête.
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' },
  // Le contenu défile et conserve un espacement régulier.
  contenu: { flexGrow: 1, padding: 24, gap: 20, backgroundColor: '#F4F7FB' },
  // L'en-tête aligne le message de bienvenue et le profil.
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  // Le petit texte donne une hiérarchie visuelle au titre.
  surtitre: { color: '#526579', fontSize: 14 },
  // Le titre principal reprend la couleur sombre de la palette.
  titre: { color: '#16324F', fontSize: 24, fontWeight: '700' },
  // La carte vide regroupe les actions de démarrage.
  carte: { padding: 22, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 14 },
  // Les cartes de tontine partagent un fond et des bordures doux.
  carteTontine: { padding: 18, borderRadius: 14, backgroundColor: '#FFFFFF', gap: 8 },
  // Le titre de chaque carte est lisible et marqué.
  titreCarte: { color: '#16324F', fontSize: 18, fontWeight: '700' },
  // Les détails utilisent un ton secondaire.
  texte: { color: '#526579', fontSize: 15, lineHeight: 22 },
  // Le bouton principal ressort grâce au bleu partagé avec les formulaires.
  boutonPrincipal: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#1769AA' },
  // Le texte du bouton principal reste contrasté.
  textePrincipal: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  // L'action secondaire utilise une bordure légère.
  boutonSecondaire: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#D5DEE8', backgroundColor: '#FFFFFF' },
  // Le texte secondaire reprend la couleur principale.
  texteSecondaire: { color: '#1769AA', fontWeight: '700', fontSize: 14 },
  // Le texte d'aide est mis en évidence sans ressembler à une erreur.
  aide: { padding: 12, borderRadius: 8, backgroundColor: '#EAF3FA', color: '#263B50', lineHeight: 21 },
  // Les tontines s'affichent verticalement.
  liste: { gap: 12 },
  // Le titre de liste sépare la section des cartes.
  titreSection: { color: '#16324F', fontSize: 20, fontWeight: '700' },
  // Les erreurs réseau sont signalées en rouge.
  erreur: { color: '#B42318', fontSize: 14 },
});
