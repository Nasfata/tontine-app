// React charge le détail et gère l'ouverture des règles.
import { useEffect, useState } from 'react';
// React Native fournit les cartes, boutons et listes compatibles web et mobile.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router lit l'identifiant et adapte le titre de la pile.
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
// appelerApi ajoute le jeton et lit la réponse de l'API.
import { appelerApi } from '../../api';
// Les composants partagés assurent la cohérence visuelle des sections.
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Bouton } from '../../components/Bouton';
import { Carte } from '../../components/Carte';
import { Chargement } from '../../components/Chargement';
// Les libellés masquent les valeurs techniques reçues du backend.
import { formaterMontant, libelleFrequence, libelleStatut } from '../../libelles';
// Les couleurs et espacements viennent du thème commun.
import { couleurs, espacements, taillesTexte } from '../../theme';

// Ce type représente les informations de la tontine renvoyées par l'API.
type Tontine = { id: number; nom: string; montant_cotisation: number | string; frequence: string; nombre_membres: number; regles: string | null; statut: string };
// Ces données décrivent les membres sans exposer leur numéro de téléphone.
type Membre = { utilisateur_id: number; nom: string; photo: string | null; role_code: string };
// Cette structure correspond au détail fourni par l'API.
type ReponseDetail = { tontine: Tontine; role_code: string; membres: Membre[]; duree_cycle: { nombre: number; unite: string } };

// Cet écran présente les chiffres, les membres et les règles d'un groupe.
export default function DetailTontine() {
  // Les paramètres identifient le groupe et signalent un retour après ajout.
  const { id, rafraichir } = useLocalSearchParams<{ id: string; rafraichir?: string }>();
  // Ces états conservent la réponse et les retours visibles à l'écran.
  const [detail, setDetail] = useState<ReponseDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  // Le détail est rechargé lorsque l'identifiant ou le signal de rafraîchissement change.
  useEffect(() => {
    // Ce drapeau empêche les mises à jour après le démontage de l'écran.
    let actif = true;
    // Cette fonction lit le détail authentifié de la tontine.
    async function chargerDetail() {
      try {
        // L'identifiant est encodé avant l'appel API.
        const resultat = await appelerApi<ReponseDetail>(`/api/tontines/${encodeURIComponent(id)}`);
        // La réponse est appliquée si la page est toujours active.
        if (actif) setDetail(resultat);
      } catch (cause) {
        // Le message de l'API reste visible en cas d'échec.
        if (actif) setErreur(cause instanceof Error ? cause.message : 'Impossible de charger cette tontine.');
      } finally {
        // Le premier indicateur se termine après la réponse.
        if (actif) setChargement(false);
      }
    }
    // Le titre d'en-tête suit le nom réel après son chargement.
    void chargerDetail();
    // Le nettoyage protège l'état React si la route est quittée.
    return () => { actif = false; };
  }, [id, rafraichir]);
  // Une seconde tentative relance la lecture sans changer de route.
  async function reessayer() {
    // L'erreur est masquée pendant la nouvelle tentative.
    setErreur('');
    setChargement(true);
    try {
      // Le même endpoint fournit les dernières informations du groupe.
      const resultat = await appelerApi<ReponseDetail>(`/api/tontines/${encodeURIComponent(id)}`);
      // Les données remplacent la version précédente.
      setDetail(resultat);
    } catch (cause) {
      // Une erreur de reprise est affichée dans son bandeau.
      setErreur(cause instanceof Error ? cause.message : 'Impossible de charger cette tontine.');
    } finally {
      // L'indicateur s'arrête quelle que soit l'issue.
      setChargement(false);
    }
  }
  // Le chargement occupe l'écran pendant la première lecture.
  if (chargement) return <Chargement texte="Chargement de la tontine…" />;
  // Une erreur de lecture est accompagnée d'une action de nouvelle tentative.
  if (!detail) return <View style={styles.erreurPage}><Text style={styles.texteErreur}>{erreur || 'Tontine introuvable.'}</Text><Bouton titre="Réessayer" onPress={() => void reessayer()} /></View>;
  // Le montant de la tontine est formaté en FCFA.
  const montant = Number(detail.tontine.montant_cotisation) || 0;
  // La cagnotte prévue correspond au montant multiplié par le nombre de membres attendu.
  const cagnotte = montant * detail.tontine.nombre_membres;
  // Le compteur correspond aux membres effectivement renvoyés par la route détail.
  const membresInscrits = detail.membres.length;
  // L'en-tête système affiche le vrai nom et conserve le bouton retour de la pile.
  return <>
    {/* Le titre de la barre de navigation suit la tontine chargée. */}
    <Stack.Screen options={{ title: detail.tontine.nom }} />
    {/* La page entière reste défilable sur les petits écrans. */}
    <ScrollView contentContainerStyle={styles.contenu}>
      {/* Le statut lisible apparaît sous le titre système. */}
      <Badge type="statut" valeur={detail.tontine.statut} />
      {/* Les indicateurs clés sont répartis en petites cartes. */}
      <View style={styles.grilleResume}>
        {/* La première carte affiche le montant de cotisation. */}
        <Carte style={styles.carteChiffre}><Text style={styles.libelleChiffre}>Cotisation</Text><Text style={styles.valeurChiffre}>{formaterMontant(montant)}</Text></Carte>
        {/* La deuxième carte traduit la fréquence du groupe. */}
        <Carte style={styles.carteChiffre}><Text style={styles.libelleChiffre}>Fréquence</Text><Text style={styles.valeurChiffre}>{libelleFrequence(detail.tontine.frequence)}</Text></Carte>
        {/* La troisième carte montre la durée calculée par le serveur. */}
        <Carte style={styles.carteChiffre}><Text style={styles.libelleChiffre}>Durée du cycle</Text><Text style={styles.valeurChiffre}>{detail.duree_cycle.nombre} {detail.duree_cycle.unite}</Text></Carte>
        {/* La quatrième carte affiche le montant total attendu du cycle. */}
        <Carte style={styles.carteChiffre}><Text style={styles.libelleChiffre}>Cagnotte attendue</Text><Text style={styles.valeurChiffre}>{formaterMontant(cagnotte)}</Text></Carte>
      </View>
      {/* La carte des membres inclut le compteur de places occupées. */}
      <Carte style={styles.section}>
        {/* Le titre présente le nombre de membres inscrits et la capacité. */}
        <Text style={styles.titreSection}>Membres · {membresInscrits}/{detail.tontine.nombre_membres}</Text>
        {/* Chaque ligne réutilise l'avatar et le badge de rôle communs. */}
        {detail.membres.map((membre) => <View key={membre.utilisateur_id} style={styles.ligneMembre}>
          {/* La photo est remplacée par une initiale si elle manque. */}
          <Avatar nom={membre.nom} photo={membre.photo} taille={46} />
          {/* Le nom et le rôle sont alignés à côté de l'avatar. */}
          <Text numberOfLines={1} style={styles.nomMembre}>{membre.nom}</Text>
          <Badge type="role" valeur={membre.role_code} />
        </View>)}
        {/* Seul le rôle de gérant permet de voir l'action d'ajout. */}
        {detail.role_code.toLowerCase() === 'gerant' && <Bouton titre="Ajouter un membre" onPress={() => router.push({ pathname: '/tontines/ajouter-membre', params: { id: String(detail.tontine.id) } } as Href)} />}
      </Carte>
      {/* Les règles sont repliables et cette section disparaît si elles sont absentes. */}
      {!!detail.tontine.regles?.trim() && <Carte style={styles.section}>
        {/* L'appui ouvre ou referme le texte des règles. */}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: reglesOuvertes }} onPress={() => setReglesOuvertes(!reglesOuvertes)} style={styles.enteteRegles}><Text style={styles.titreSection}>Règles</Text><Text style={styles.texteAction}>{reglesOuvertes ? 'Masquer' : 'Afficher'}</Text></Pressable>
        {/* Le texte des règles n'est monté que lorsque la section est ouverte. */}
        {reglesOuvertes && <Text style={styles.texteRegles}>{detail.tontine.regles}</Text>}
      </Carte>}
      {/* Carte vide réservée à l'équipe qui ajoutera la gestion des cotisations. */}
      <Carte style={styles.carteEquipe}><Text style={styles.titreSection}>Cotisations</Text><Text style={styles.texteSecondaire}>Les informations de cotisation apparaîtront ici.</Text></Carte>
      {/* Carte vide réservée à l'équipe qui ajoutera la gestion des tours. */}
      <Carte style={styles.carteEquipe}><Text style={styles.titreSection}>Tours</Text><Text style={styles.texteSecondaire}>Le calendrier des tours apparaîtra ici.</Text></Carte>
    </ScrollView>
  </>;
}

// Ces styles utilisent le thème commun et s'adaptent à la largeur disponible.
const styles = StyleSheet.create({
  // Le contenu respecte les marges et l'espacement du thème.
  contenu: { flexGrow: 1, padding: espacements.moyen, gap: espacements.moyen, backgroundColor: couleurs.fond },
  // Les chiffres clés se répartissent en deux colonnes.
  grilleResume: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.petit },
  // Chaque petite carte occupe environ la moitié de la largeur.
  carteChiffre: { flexGrow: 1, flexBasis: '45%', minHeight: 92, justifyContent: 'space-between', gap: espacements.petit },
  // Le nom du chiffre clé reste discret.
  libelleChiffre: { color: couleurs.secondaire, fontSize: taillesTexte.petit },
  // La valeur est mise en évidence avec le bleu nuit.
  valeurChiffre: { color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '700' },
  // Les cartes de section utilisent des espacements constants.
  section: { gap: espacements.moyen },
  // Le titre sépare nettement les groupes de contenu.
  titreSection: { color: couleurs.principal, fontSize: taillesTexte.sousTitre, fontWeight: '700' },
  // Chaque membre apparaît sur une ligne compacte.
  ligneMembre: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: espacements.petit, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: couleurs.bordure },
  // Le nom occupe l'espace laissé entre avatar et badge.
  nomMembre: { flex: 1, color: couleurs.principal, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  // La rangée des règles aligne le titre et son action.
  enteteRegles: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Le texte de l'action reprend la couleur accentuée.
  texteAction: { color: couleurs.accent, fontSize: taillesTexte.secondaire, fontWeight: '700' },
  // Le contenu des règles reste lisible sur plusieurs lignes.
  texteRegles: { color: couleurs.secondaire, fontSize: taillesTexte.corps, lineHeight: 24 },
  // Les cartes vides montrent clairement l'emplacement des futures sections.
  carteEquipe: { minHeight: 112, justifyContent: 'center', gap: espacements.petit, borderWidth: 1, borderStyle: 'dashed', borderColor: couleurs.bordure },
  // Le texte d'aide reste secondaire.
  texteSecondaire: { color: couleurs.secondaire, fontSize: taillesTexte.secondaire },
  // L'erreur de chargement occupe une zone confortable.
  erreurPage: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: espacements.moyen, padding: espacements.grand, backgroundColor: couleurs.fond },
  // Le message d'erreur utilise la couleur dédiée.
  texteErreur: { color: couleurs.erreur, textAlign: 'center', fontSize: taillesTexte.corps },
});
