// React charge le détail et gère l'ouverture des règles.
import { useEffect, useState } from 'react';
// React Native fournit les cartes, boutons et listes compatibles web et mobile.
import { Platform,Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router lit l'identifiant et ouvre l'écran d'ajout de membre.
import { router, useLocalSearchParams, type Href } from 'expo-router';
// Ionicons fournit la flèche du bouton retour.
import { Ionicons } from '@expo/vector-icons';
// Le contexte donne la personne connectée et la déconnexion.
import { useAuth } from '../../AuthContext';
// appelerApi ajoute le jeton et lit la réponse de l'API.
import { appelerApi } from '../../api';
// Les composants partagés assurent la cohérence visuelle des sections.
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Bouton } from '../../components/Bouton';
import { Carte } from '../../components/Carte';
import { CarteChiffre } from '../../components/CarteChiffre';
import { Chargement } from '../../components/Chargement';
// Le même bandeau que l'accueil.
import { EnTete } from '../../components/EnTete';
// La confirmation de déconnexion est la même que sur l'accueil.
import { FeuilleModale } from '../../components/FeuilleModale';
// Les libellés masquent les valeurs techniques reçues du backend.
import { formaterMontant, libelleFrequence } from '../../libelles';
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
  // L'utilisateur connecté alimente le bandeau.
  const { utilisateur, deconnexion } = useAuth();
  // Ces états conservent la réponse et les retours visibles à l'écran.
  const [detail, setDetail] = useState<ReponseDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  // Cet état ouvre la confirmation de déconnexion.
  const [confirmerDeconnexion, setConfirmerDeconnexion] = useState(false);

    // Membre en cours de retrait (null = aucune confirmation ouverte).
  const [membreARetirer, setMembreARetirer] = useState<Membre | null>(null);
  // Retrait en cours et message d'erreur éventuel.
  const [retraitEnCours, setRetraitEnCours] = useState(false);
  const [erreurRetrait, setErreurRetrait] = useState('');

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
    void chargerDetail();
    // Le nettoyage protège l'état React si la route est quittée.
    return () => { actif = false; };
  }, [id, rafraichir]);

  // Une seconde tentative relance la lecture sans changer de route.
  async function reessayer() {
    setErreur('');
    setChargement(true);
    try {
      const resultat = await appelerApi<ReponseDetail>(`/api/tontines/${encodeURIComponent(id)}`);
      setDetail(resultat);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : 'Impossible de charger cette tontine.');
    } finally {
      setChargement(false);
    }
  }

    // Retire le membre choisi, puis recharge le détail de la tontine.
  async function retirerMembre() {
    // Rien à faire si aucun membre n'est sélectionné.
    if (!membreARetirer) return;
    setRetraitEnCours(true);
    setErreurRetrait('');
    try {
      // Appel de la route DELETE créée dans le backend.
      await appelerApi(`/api/tontines/${encodeURIComponent(id)}/membres/${membreARetirer.utilisateur_id}`, { method: 'DELETE' });
      // On retire aussi le membre de la liste affichée, sans attendre un rechargement.
      setDetail((precedent) => precedent ? { ...precedent, membres: precedent.membres.filter((m) => m.utilisateur_id !== membreARetirer.utilisateur_id) } : precedent);
      // Ferme la fenêtre de confirmation.
      setMembreARetirer(null);
    } catch (cause) {
      // Le message du backend s'affiche dans la fenêtre.
      setErreurRetrait(cause instanceof Error ? cause.message : 'Impossible de retirer ce membre.');
    } finally {
      setRetraitEnCours(false);
    }
  }

  // Bandeau bleu nuit commun : avatar cliquable (profil) et déconnexion.
  // Le nom de la tontine est affiché en grand dans le contenu, pas ici.
  const bandeau = <EnTete mode="principal" titre={utilisateur?.nom ?? 'Mon compte'} sousTitre="Détail de la tontine" avatar={utilisateur?.photo} onDeconnexion={() => setConfirmerDeconnexion(true)} />;
  // Ligne de retour : flèche + texte, zone tactile large.
  // const ligneRetour = <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.boutonRetour}>
  //   <Ionicons name="arrow-back" size={22} color={couleurs.principal} />
  //   <Text style={styles.texteRetour}>Retour</Text>
  // </Pressable>;
  // Fenêtre de confirmation de déconnexion.
  const fenetreDeconnexion = <FeuilleModale visible={confirmerDeconnexion} titre="Se déconnecter ?" placement="centre" onFermer={() => setConfirmerDeconnexion(false)} pied={<View style={styles.actionsConfirmation}><Bouton titre="Annuler" variante="secondaire" onPress={() => setConfirmerDeconnexion(false)} /><Bouton titre="Se déconnecter" variante="danger" onPress={() => void deconnexion()} /></View>}>
    <Text style={styles.texteConfirmation}>Tu devras te reconnecter pour retrouver ton espace.</Text>
  </FeuilleModale>;

  // Le chargement occupe l'écran pendant la première lecture.
  if (chargement) return <Chargement texte="Chargement de la tontine…" />;

  // Une erreur de lecture : bandeau, retour, message et nouvelle tentative.
  if (!detail) return <View style={styles.ecran}>
    {bandeau}
    {/* <View style={styles.contenu}>{ligneRetour}</View> */}
    <View style={styles.erreurPage}>
      <Text style={styles.texteErreur}>{erreur || 'Tontine introuvable.'}</Text>
      <Bouton titre="Réessayer" onPress={() => void reessayer()} />
    </View>
    {fenetreDeconnexion}
  </View>;
  // Le gérant peut retirer des membres tant que la tontine est en préparation.
  const peutRetirer = detail.role_code.toLowerCase() === 'gerant' && detail.tontine.statut === 'en_preparation';
  // Le montant de la tontine est formaté en FCFA.
  const montant = Number(detail.tontine.montant_cotisation) || 0;
  // La cagnotte prévue correspond au montant multiplié par le nombre de membres attendu.
  const cagnotte = montant * detail.tontine.nombre_membres;
  // Le compteur correspond aux membres effectivement renvoyés par la route détail.
  const membresInscrits = detail.membres.length;

  return <View style={styles.ecran}>
    {/* Bandeau bleu nuit en haut, comme sur l'accueil. */}
    {bandeau}
    {/* Seul le contenu défile, le bandeau reste fixe. */}
    <ScrollView style={styles.defilement} contentContainerStyle={styles.contenu}>
      {/* Retour vers la liste. */}
      {/* {ligneRetour} */}
      {/* Le nom de la tontine en grand titre, avec son statut juste dessous. */}
      <View style={styles.blocTitre}>
        <Text style={styles.nomTontine} numberOfLines={3}>{detail.tontine.nom}</Text>
        <Badge type="statut" valeur={detail.tontine.statut} />
      </View>
      {/* Les indicateurs clés sont répartis en petites cartes. */}
      <View style={styles.grilleResume}>
        <CarteChiffre titre="Cotisation" valeur={formaterMontant(montant)} icone="wallet-outline" variante="sombre" />
        <CarteChiffre titre="Fréquence" valeur={libelleFrequence(detail.tontine.frequence)} icone="calendar-outline" />
        <CarteChiffre titre="Durée du cycle" valeur={`${detail.duree_cycle.nombre} ${detail.duree_cycle.unite}`} icone="time-outline" />
        <CarteChiffre titre="Cotisations prévues" valeur={formaterMontant(cagnotte)} icone="checkmark-circle-outline" variante="succes" />
      </View>
      {/* La carte des membres inclut le compteur de places occupées. */}
      <Carte style={styles.section}>
        <Text style={styles.titreSection}>Membres · {membresInscrits}/{detail.tontine.nombre_membres}</Text>
        {/* Chaque ligne réutilise l'avatar et le badge de rôle communs. */}
        {detail.membres.map((membre) => <View key={membre.utilisateur_id} style={styles.ligneMembre}>
          <Avatar nom={membre.nom} photo={membre.photo} taille={46} />
          <Text numberOfLines={1} style={styles.nomMembre}>{membre.nom}</Text>
          <Badge type="role" valeur={membre.role_code} />
          {/* Bouton de retrait : visible pour le gérant, jamais sur lui-même (le gérant). */}
          {peutRetirer && membre.role_code !== 'gerant' && <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${membre.nom}`} onPress={() => { setErreurRetrait(''); setMembreARetirer(membre); }} style={styles.boutonRetirer}>
            <Ionicons name="person-remove-outline" size={20} color={couleurs.erreurFormulaire} />
          </Pressable>}
        </View>)}
        {/* Seul le gérant voit l'action d'ajout. */}
        {detail.role_code.toLowerCase() === 'gerant' && <Bouton titre="Ajouter un membre" onPress={() => router.push({ pathname: '/tontines/ajouter-membre', params: { id: String(detail.tontine.id) } } as Href)} />}
      </Carte>
      {/* Les règles sont repliables et disparaissent si elles sont absentes. */}
      {!!detail.tontine.regles?.trim() && <Carte style={styles.section}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: reglesOuvertes }} onPress={() => setReglesOuvertes(!reglesOuvertes)} style={styles.enteteRegles}><Text style={styles.titreSection}>Règles</Text><Text style={styles.texteAction}>{reglesOuvertes ? 'Masquer' : 'Afficher'}</Text></Pressable>
        {reglesOuvertes && <Text style={styles.texteRegles}>{detail.tontine.regles}</Text>}
      </Carte>}
      {/* Cartes vides réservées à l'équipe (cotisations et tours). */}
      <Carte style={styles.carteEquipe}><Text style={styles.titreSection}>Cotisations</Text><Text style={styles.texteSecondaire}>Les informations de cotisation apparaîtront ici.</Text></Carte>
      <Carte style={styles.carteEquipe}><Text style={styles.titreSection}>Tours</Text><Text style={styles.texteSecondaire}>Le calendrier des tours apparaîtra ici.</Text></Carte>
    </ScrollView>
        {/* Confirmation avant de retirer un membre. */}
    <FeuilleModale visible={!!membreARetirer} titre="Retirer ce membre ?" placement="centre" onFermer={() => setMembreARetirer(null)} pied={<View style={styles.actionsConfirmation}><Bouton titre="Annuler" variante="secondaire" onPress={() => setMembreARetirer(null)} /><Bouton titre={retraitEnCours ? 'Retrait…' : 'Retirer'} variante="danger" onPress={() => void retirerMembre()} /></View>}>
      <Text style={styles.texteConfirmation}>{membreARetirer?.nom} sera retiré de la tontine. Son compte n'est pas supprimé, tu pourras le rajouter plus tard.</Text>
      {!!erreurRetrait && <Text style={[styles.texteConfirmation, styles.erreurRetrait]}>{erreurRetrait}</Text>}
    </FeuilleModale>
    {fenetreDeconnexion}
  </View>;
}

// Ces styles utilisent le thème commun et s'adaptent à la largeur disponible.
const styles = StyleSheet.create({
  // flex: 1 suffit (pas de height en %, cause d'écrans vides sur le web).
  ecran: { flex: 1, width: '100%', backgroundColor: couleurs.fond },
  defilement: { flex: 1 },
  // Le contenu occupe toute la largeur et conserve des marges régulières.
  contenu: { flexGrow: 1, width: '100%', padding: espacements.moyen, paddingBottom: 40, gap: espacements.moyen, backgroundColor: couleurs.fond },
  // Bouton de retour : flèche + texte, zone tactile large.
  boutonRetour: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: espacements.petit, alignSelf: 'flex-start' },
  texteRetour: { color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '600' },
  // Bloc du nom de la tontine et de son statut.
  blocTitre: { gap: espacements.petit, alignItems: 'flex-start' },
  // Le nom est le titre principal de la page.
  nomTontine: { color: couleurs.principal, fontSize: 28, fontWeight: '800' },
  // Les chiffres clés se répartissent en deux colonnes.
  grilleResume: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.petit },
  section: { gap: espacements.moyen },
  titreSection: { color: couleurs.texte, fontSize: taillesTexte.sousTitre, fontWeight: '700' },
  ligneMembre: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: espacements.petit, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: couleurs.bordure },
  nomMembre: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  enteteRegles: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  texteAction: { color: couleurs.accent, fontSize: taillesTexte.secondaire, fontWeight: '700' },
  texteRegles: { color: couleurs.texteSecondaire, fontSize: taillesTexte.corps, lineHeight: 24 },
  carteEquipe: { minHeight: 112, justifyContent: 'center', gap: espacements.petit, borderWidth: 1, borderStyle: 'dashed', borderColor: couleurs.bordure },
  texteSecondaire: { color: couleurs.texteSecondaire, fontSize: taillesTexte.secondaire },
  erreurPage: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: espacements.moyen, padding: espacements.grand, backgroundColor: couleurs.fond },
  texteErreur: { color: couleurs.erreurFormulaire, textAlign: 'center', fontSize: taillesTexte.corps },
  actionsConfirmation: { flexDirection: 'row', gap: espacements.petit },
  texteConfirmation: { color: couleurs.texteSecondaire, fontSize: taillesTexte.secondaire, lineHeight: 22, textAlign: 'center' },

    // Bouton rond de retrait, zone tactile de 44 px.
  boutonRetirer: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  // Message d'erreur dans la fenêtre de confirmation.
  erreurRetrait: { marginTop: espacements.petit, color: couleurs.erreurFormulaire },
});