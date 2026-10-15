// React charge le détail et conserve les messages de l'écran.
import { useEffect, useState } from 'react';
// Expo Router lit le paramètre dynamique de l'URL.
import { router, useLocalSearchParams, type Href } from 'expo-router';
// React Native fournit l'interface utilisable sur toutes les plateformes.
import { ActivityIndicator, Button, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// appelerApi ajoute le jeton et lit la réponse JSON du backend.
import { appelerApi } from '../../api';
// API_URL sert à former l'adresse absolue des photos de membres.
import { API_URL } from '../../config';

// Ce type représente les informations du groupe renvoyées par l'API.
type Tontine = { id: number; nom: string; montant_cotisation: number | string; frequence: string; nombre_membres: number; regles: string | null; statut: string };
// Ces propriétés décrivent chaque membre sans son numéro de téléphone.
type Membre = { utilisateur_id: number; nom: string; photo: string | null; role_code: string };
// Cette réponse suit le contrat de GET /api/tontines/:id.
type ReponseDetail = { tontine: Tontine; role_code: string; membres: Membre[]; duree_cycle: { nombre: number; unite: string } };
// Cette table affiche les fréquences avec leur libellé en français.
const libellesFrequence: Record<string, string> = { quotidien: 'Quotidien', hebdomadaire: 'Hebdomadaire', mensuel: 'Mensuel' };

// Cet écran charge et affiche le détail d'une tontine.
export default function DetailTontine() {
  // L'identifiant provient du segment dynamique [id].
  const { id, rafraichir } = useLocalSearchParams<{ id: string; rafraichir?: string }>();
  // Ces états stockent le détail et les retours de chargement.
  const [detail, setDetail] = useState<ReponseDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  // Le détail est rechargé si l'identifiant de route change.
  useEffect(() => {
    // Ce drapeau protège l'écran contre les réponses après démontage.
    let actif = true;
    // Cette fonction lit le détail uniquement via la route authentifiée.
    async function chargerDetail() {
      try {
        // L'identifiant du chemin est encodé avant de construire l'URL.
        const resultat = await appelerApi<ReponseDetail>(`/api/tontines/${encodeURIComponent(id)}`);
        // La réponse est conservée si l'écran est toujours monté.
        if (actif) setDetail(resultat);
      } catch (cause) {
        // Les erreurs backend sont affichées à la place du détail.
        if (actif) setErreur(cause instanceof Error ? cause.message : 'Impossible de charger cette tontine.');
      } finally {
        // L'indicateur disparaît une fois la réponse reçue.
        if (actif) setChargement(false);
      }
    }
    // On lance la lecture du détail pour la route active.
    void chargerDetail();
    // On évite une mise à jour React si l'utilisateur quitte l'écran.
    return () => { actif = false; };
  }, [id, rafraichir]);
  // La requête affiche un indicateur centré pendant son traitement.
  if (chargement) return <View style={styles.centre}><ActivityIndicator size="large" color="#1769AA" /></View>;
  // Une réponse absente est présentée comme une erreur lisible.
  if (!detail) return <View style={styles.centre}><Text style={styles.erreur}>{erreur || 'Tontine introuvable.'}</Text><Button title="Retour" onPress={() => router.back()} /></View>;
  // Le statut initial reçoit le libellé demandé dans l'interface.
  const statutAffiche = detail.tontine.statut === 'en_preparation' ? 'En préparation' : detail.tontine.statut;
  // Le montant est formaté en français avec la devise utilisée par le projet.
  const montantAffiche = new Intl.NumberFormat('fr-FR').format(Number(detail.tontine.montant_cotisation));
  // Le contenu défile pour rester lisible sur les petits écrans.
  return <ScrollView contentContainerStyle={styles.contenu}>
    {/* L'en-tête affiche le nom et le statut du groupe. */}
    <View style={styles.entete}>
      {/* Le nom est le titre principal de la page. */}
      <Text style={styles.titre}>{detail.tontine.nom}</Text>
      {/* Le badge reprend le statut fourni par le backend. */}
      <Text style={styles.badge}>{statutAffiche}</Text>
    </View>
    {/* Les paramètres principaux sont groupés dans une carte. */}
    <View style={styles.carte}>
      {/* Le montant de la cotisation est affiché en FCFA. */}
      <Text style={styles.information}>Cotisation : {montantAffiche} FCFA</Text>
      {/* La fréquence est traduite en libellé utilisateur. */}
      <Text style={styles.information}>Fréquence : {libellesFrequence[detail.tontine.frequence] ?? detail.tontine.frequence}</Text>
      {/* Le statut est aussi rappelé dans les informations textuelles. */}
      <Text style={styles.information}>Statut : {statutAffiche}</Text>
      {/* La durée du cycle est calculée et fournie par le backend. */}
      <Text style={styles.information}>Durée du cycle : {detail.duree_cycle.nombre} {detail.duree_cycle.unite}</Text>
      {/* Les règles sont affichées si le gérant en a renseigné. */}
      <Text style={styles.sousTitre}>Règles</Text>
      <Text style={styles.texte}>{detail.tontine.regles?.trim() || 'Aucune règle renseignée.'}</Text>
    </View>
    {/* Cette section liste les membres connus de la tontine. */}
    <View style={styles.section}>
      {/* Le titre indique le nombre de membres affichés. */}
      <Text style={styles.titreSection}>Membres ({detail.membres.length})</Text>
      {/* Chaque ligne contient une photo ou une initiale, un nom et un rôle. */}
      {detail.membres.map((membre) => {
        // Le chemin photo relatif est complété avec l'adresse du backend.
        const photoUri = membre.photo ? (membre.photo.startsWith('http') ? membre.photo : `${API_URL}${membre.photo}`) : null;
        // Le code de rôle est transformé en libellé lisible.
        const roleAffiche = membre.role_code.toLowerCase() === 'gerant' ? 'Gérant' : 'Membre';
        // La ligne du membre affiche ses informations sans téléphone.
        return <View key={membre.utilisateur_id} style={styles.ligneMembre}>
          {/* La photo est remplacée par la première lettre du nom si elle manque. */}
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <View style={styles.initiale}><Text style={styles.texteInitiale}>{membre.nom.charAt(0).toUpperCase()}</Text></View>}
          {/* Le nom et le rôle sont alignés à côté de l'avatar. */}
          <View style={styles.infosMembre}><Text style={styles.nomMembre}>{membre.nom}</Text><Text style={styles.roleMembre}>{roleAffiche}</Text></View>
        </View>;
      })}
      {/* Un gérant voit l'action d'ajout prévue pour la prochaine étape. */}
      {detail.role_code.toLowerCase() === 'gerant' && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/tontines/ajouter-membre', params: { id: String(detail.tontine.id) } } as Href)} style={styles.boutonAjouter}><Text style={styles.texteAjouter}>Ajouter un membre</Text></Pressable>}
      {/* Le texte explique pourquoi l'action n'ouvre pas encore de formulaire. */}
    </View>
    {/* Cette zone réservée permettra d'intégrer les sections de cotisations. */}
    <View style={styles.zoneEquipe}><Text style={styles.sousTitre}>Cotisations</Text><Text style={styles.texteAide}>Section réservée à l’équipe cotisations.</Text></View>
    {/* Cette zone réservée permettra d'intégrer les sections de tours. */}
    <View style={styles.zoneEquipe}><Text style={styles.sousTitre}>Tours</Text><Text style={styles.texteAide}>Section réservée à l’équipe tours.</Text></View>
  </ScrollView>;
}

// Ces styles réutilisent la palette des autres écrans de l'application.
const styles = StyleSheet.create({
  // L'indicateur et les erreurs sont centrés dans l'écran.
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: '#F4F7FB' },
  // Le contenu principal défile avec des marges régulières.
  contenu: { flexGrow: 1, padding: 24, gap: 16, backgroundColor: '#F4F7FB' },
  // L'en-tête sépare le nom et le statut.
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  // Le titre du groupe est mis en évidence.
  titre: { flexShrink: 1, color: '#16324F', fontSize: 26, fontWeight: '700' },
  // Le badge rend le statut facile à repérer.
  badge: { overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#EAF3FA', color: '#1769AA', fontSize: 13, fontWeight: '700' },
  // Les détails du groupe sont regroupés dans une carte blanche.
  carte: { padding: 20, borderRadius: 14, backgroundColor: '#FFFFFF', gap: 10 },
  // Les lignes affichent les informations générales.
  information: { color: '#263B50', fontSize: 15, lineHeight: 22 },
  // Les sous-titres distinguent les sections internes.
  sousTitre: { marginTop: 5, color: '#16324F', fontSize: 16, fontWeight: '700' },
  // Le texte descriptif est de couleur secondaire.
  texte: { color: '#526579', fontSize: 14, lineHeight: 21 },
  // Les membres sont présentés dans une carte verticale.
  section: { padding: 20, borderRadius: 14, backgroundColor: '#FFFFFF', gap: 12 },
  // Le titre de section annonce le nombre de membres.
  titreSection: { color: '#16324F', fontSize: 20, fontWeight: '700' },
  // Chaque membre est présenté sur une ligne horizontale.
  ligneMembre: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  // La photo de profil est recadrée en cercle.
  photo: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EAF3FA' },
  // Le cercle de repli contient l'initiale du membre.
  initiale: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, backgroundColor: '#DCECF8' },
  // L'initiale est colorée avec le bleu principal.
  texteInitiale: { color: '#1769AA', fontSize: 20, fontWeight: '700' },
  // Les libellés du membre sont empilés.
  infosMembre: { flex: 1, gap: 3 },
  // Le nom est plus marqué que le rôle.
  nomMembre: { color: '#16324F', fontSize: 15, fontWeight: '600' },
  // Le rôle utilise la couleur de texte secondaire.
  roleMembre: { color: '#526579', fontSize: 13 },
  // Le bouton d'ajout reprend les couleurs d'action de l'application.
  boutonAjouter: { minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: 6, borderRadius: 10, backgroundColor: '#1769AA' },
  // Le texte du bouton reste contrasté sur son fond.
  texteAjouter: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  // Le message d'aide indique que le parcours sera ajouté plus tard.
  texteAide: { color: '#526579', fontSize: 14, lineHeight: 21 },
  // Les futures sections ont un fond et une bordure distincts.
  zoneEquipe: { padding: 18, borderWidth: 1, borderColor: '#D5DEE8', borderStyle: 'dashed', borderRadius: 14, backgroundColor: '#FFFFFF', gap: 5 },
  // Les erreurs sont affichées avec une couleur rouge accessible.
  erreur: { color: '#B42318', fontSize: 15, textAlign: 'center' },
});
