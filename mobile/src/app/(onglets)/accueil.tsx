// React charge les tontines, gère le rafraîchissement et l'aide de première visite.
import { useCallback, useEffect, useState } from 'react';
// React Native fournit la liste défilante, le rafraîchissement et les zones tactiles.
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router ouvre le détail et les destinations des actions.
import { Link, router, type Href } from 'expo-router';
// Le contexte donne le nom de la personne connectée.
import { useAuth } from '../../AuthContext';
// appelerApi transmet le jeton et expose les erreurs HTTP.
import { appelerApi, ErreurApi } from '../../api';
// Les composants partagés rendent les cartes, avatars, boutons et états cohérents.
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Bouton } from '../../components/Bouton';
import { Carte } from '../../components/Carte';
import { Chargement } from '../../components/Chargement';
import { EtatVide } from '../../components/EtatVide';
// Les fonctions de libellé traduisent les valeurs techniques et formatent les montants.
import { formaterMontant, libelleFrequence } from '../../libelles';
// La palette et l'espacement sont définis une seule fois pour l'application.
import { couleurs, espacements, taillesTexte } from '../../theme';

// Ces champs correspondent aux données affichées dans chaque carte.
type Tontine = { id: number | string; nom: string; role_code?: string; statut?: string; frequence?: string; montant_cotisation?: number | string; nombre_membres?: number; nombre_membres_inscrits?: number };
// L'API peut renvoyer directement la liste ou l'envelopper dans tontines.
type ReponseTontines = Tontine[] | { tontines?: Tontine[] };

// Cet écran d'accueil donne accès aux groupes et à leur détail.
export default function Accueil() {
  // Le contexte fournit le nom affiché dans le message d'accueil.
  const { utilisateur } = useAuth();
  // Ces états stockent les résultats, le chargement, l'erreur et l'aide de première visite.
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState('');
  const [afficherAide, setAfficherAide] = useState(false);
  // Cette fonction relit les tontines pour le chargement initial, le geste ou le bouton.
  const chargerTontines = useCallback(async (tirer = false) => {
    // Le geste d'actualisation affiche un indicateur distinct du chargement initial.
    if (tirer) setActualisation(true);
    // Les anciennes erreurs ne doivent pas rester affichées après une nouvelle tentative.
    setErreur('');
    try {
      // La liste est demandée au backend avec le jeton courant.
      const resultat = await appelerApi<ReponseTontines>('/api/tontines');
      // Ce journal temporaire permet de vérifier la réponse dans la console Expo ou navigateur.
      console.log('Réponse GET /api/tontines :', resultat);
      // Les deux formats de réponse sont convertis en liste.
      const liste = Array.isArray(resultat) ? resultat : resultat.tontines ?? [];
      // La liste est mise à jour après une réponse correcte.
      setTontines(liste);
    } catch (cause) {
      // Une route absente équivaut temporairement à une liste vide.
      if (cause instanceof ErreurApi && cause.statut === 404) setTontines([]);
      // Les autres erreurs sont présentées avec une action de nouvelle tentative.
      else setErreur(cause instanceof Error ? cause.message : 'Impossible de charger les tontines.');
    } finally {
      // Les deux indicateurs sont arrêtés après la fin de la requête.
      setChargement(false);
      setActualisation(false);
    }
  }, []);
  // Le chargement initial appelle la même fonction que le rafraîchissement.
  useEffect(() => { void chargerTontines(); }, [chargerTontines]);
  // Un nom complet est réduit à son prénom dans le message d'accueil.
  const prenom = utilisateur?.nom?.trim().split(/\s+/)[0] || 'vous';
  // L'indicateur remplace la liste seulement pendant sa première lecture.
  if (chargement) return <Chargement texte="Chargement de vos tontines…" />;
  // L'accueil conserve le défilement et prend en charge le geste de rafraîchissement.
  return <ScrollView contentContainerStyle={styles.contenu} refreshControl={<RefreshControl refreshing={actualisation} onRefresh={() => void chargerTontines(true)} tintColor={couleurs.accent} colors={[couleurs.accent]} />}>
    {/* La salutation et l'accès au profil composent l'en-tête principal. */}
    <View style={styles.entete}>
      {/* Le prénom est mis en évidence sans afficher le nom complet. */}
      <View style={styles.blocBonjour}><Text style={styles.surtitre}>Votre espace tontine</Text><Text style={styles.titre}>Bonjour, {prenom}</Text></View>
      {/* L'avatar ouvre directement le profil. */}
      <Link href={'/profil' as Href} asChild><Pressable accessibilityRole="button" accessibilityLabel="Ouvrir mon profil"><Avatar nom={utilisateur?.nom ?? '?'} taille={52} /></Pressable></Link>
    </View>
    {/* La création reste visible que la liste soit vide ou remplie. */}
    <Link href={'/tontines/creer' as Href} asChild><Pressable accessibilityRole="button" style={styles.lienCreation}><Text style={styles.texteCreation}>+ Nouvelle tontine</Text></Pressable></Link>
    {/* L'erreur réseau apparaît dans un bandeau avec son action de reprise. */}
    {!!erreur && <Carte style={styles.bandeauErreur}><Text style={styles.texteErreur}>{erreur}</Text><Bouton titre="Réessayer" variante="secondaire" onPress={() => void chargerTontines(true)} /></Carte>}
    {/* Une liste vide propose une explication et les deux choix de départ. */}
    {tontines.length === 0 && !erreur ? <Carte><EtatVide titre="Aucune tontine pour le moment" texte="Crée ton premier groupe ou demande au gérant de t'ajouter avec ton numéro." actions={[{ titre: 'Créer une tontine', action: () => router.push('/tontines/creer') }, { titre: 'Rejoindre une tontine', action: () => setAfficherAide(true) }]} />{afficherAide && <Text style={styles.aide}>Demande au gérant de t'ajouter avec ton numéro de téléphone.</Text>}</Carte> : tontines.length > 0 ? <View style={styles.liste}>
      {/* Le titre précède les cartes de groupe. */}
      <Text style={styles.titreSection}>Mes tontines</Text>
      {/* Chaque carte entière ouvre le détail de la tontine concernée. */}
      {tontines.map((tontine) => {
        // Les nombres affichés servent aussi à calculer la progression du groupe.
        const membres = tontine.nombre_membres_inscrits ?? 0;
        const capacite = tontine.nombre_membres ?? 0;
        const progression = capacite > 0 ? Math.min(1, membres / capacite) : 0;
        // Le lien garde la carte entière accessible au doigt et au clavier.
        return <Link key={tontine.id} href={{ pathname: '/tontines/[id]', params: { id: String(tontine.id) } } as Href} asChild><Pressable accessibilityRole="button" style={({ pressed }) => [styles.carteTappable, pressed && styles.appuye]}><Carte style={styles.carteTontine}>
          {/* Le nom et les badges forment la ligne de titre de la carte. */}
          <View style={styles.ligneTitre}><Text style={styles.nomTontine}>{tontine.nom}</Text><Badge type="role" valeur={tontine.role_code ?? 'membre'} /></View>
          {/* Le statut est traduit avant d'être affiché. */}
          <Badge type="statut" valeur={tontine.statut ?? ''} />
          {/* Le montant et la fréquence résument les contributions prévues. */}
          <Text style={styles.information}>{tontine.montant_cotisation === undefined ? 'Montant non précisé' : formaterMontant(tontine.montant_cotisation)} · {libelleFrequence(tontine.frequence)}</Text>
          {/* Le compteur et la barre montrent le remplissage de la tontine. */}
          <Text style={styles.compteur}>{membres}/{capacite || '—'} membres</Text>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: capacite, now: membres }} style={styles.fondProgression}><View style={[styles.progression, { width: `${progression * 100}%` }]} /></View>
        </Carte></Pressable></Link>;
      })}
    </View> : null}
  </ScrollView>;
}

// Ces styles s'appuient exclusivement sur le thème partagé.
const styles = StyleSheet.create({
  // Le contenu défile avec une marge confortable autour des cartes.
  contenu: { flexGrow: 1, padding: espacements.moyen, gap: espacements.moyen, backgroundColor: couleurs.fond },
  // L'en-tête laisse le prénom et l'avatar respirer.
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espacements.moyen },
  // Le texte occupe la place disponible à côté de l'avatar.
  blocBonjour: { flex: 1, gap: espacements.tresPetit },
  // Le surtitre reste discret au-dessus de la salutation.
  surtitre: { color: couleurs.secondaire, fontSize: taillesTexte.secondaire },
  // Le prénom devient le premier repère de la page.
  titre: { color: couleurs.principal, fontSize: taillesTexte.titre, fontWeight: '700' },
  // L'action de création utilise le ton bleu nuit et une grande zone tactile.
  lienCreation: { minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: couleurs.principal },
  // Le texte conserve la casse française naturelle.
  texteCreation: { color: couleurs.carte, fontSize: taillesTexte.corps, fontWeight: '700' },
  // Le bandeau d'erreur reprend la couleur rouge atténuée du thème.
  bandeauErreur: { gap: espacements.petit, backgroundColor: couleurs.rougeClair },
  // Le texte d'erreur reste contrasté.
  texteErreur: { color: couleurs.erreur, fontSize: taillesTexte.secondaire },
  // L'aide est présentée sous l'état vide après le choix de rejoindre.
  aide: { padding: espacements.moyen, color: couleurs.secondaire, textAlign: 'center' },
  // Les cartes sont espacées avec un rythme régulier.
  liste: { gap: espacements.moyen },
  // Le titre de section reprend une taille intermédiaire.
  titreSection: { color: couleurs.principal, fontSize: taillesTexte.sousTitre, fontWeight: '700' },
  // La zone tappable garde l'intégralité de la surface de carte active.
  carteTappable: { borderRadius: 18 },
  // L'appui est visible sans changer la palette.
  appuye: { opacity: 0.82 },
  // Les cartes regroupent titre, badges, chiffres et progression.
  carteTontine: { gap: espacements.petit, borderRadius: 18 },
  // Le nom reste lisible à côté du badge de rôle.
  ligneTitre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacements.petit },
  // Le nom de tontine est le texte le plus important de la carte.
  nomTontine: { flex: 1, color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '700' },
  // Les paramètres financiers et la fréquence sont secondaires.
  information: { color: couleurs.secondaire, fontSize: taillesTexte.secondaire },
  // Le compteur de membres est visible avant la barre.
  compteur: { color: couleurs.principal, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  // Le fond fin rend la capacité perceptible sans dominer la carte.
  fondProgression: { height: 5, overflow: 'hidden', borderRadius: 4, backgroundColor: couleurs.bleuClair },
  // La progression reprend la couleur dorée du thème.
  progression: { height: '100%', borderRadius: 4, backgroundColor: couleurs.accent },
});
