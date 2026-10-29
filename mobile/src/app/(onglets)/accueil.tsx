// React charge les tontines, gère le rafraîchissement et l'aide "Rejoindre".
import { useCallback, useEffect, useState } from 'react';
// React Native fournit la liste défilante, le rafraîchissement et les zones tactiles.
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router ouvre le détail et les destinations des actions.
import { Link, router, type Href } from 'expo-router';
// Ionicons fournit l'icône de l'accueil d'un nouveau compte.
import { Ionicons } from '@expo/vector-icons';
// Le contexte donne la personne connectée et l'action de déconnexion.
import { useAuth } from '../../AuthContext';
// appelerApi transmet le jeton et expose les erreurs HTTP.
import { appelerApi, ErreurApi } from '../../api';
// Les composants partagés rendent les cartes, boutons et états cohérents.
import { Badge } from '../../components/Badge';
import { Bouton } from '../../components/Bouton';
import { Carte } from '../../components/Carte';
import { CarteChiffre } from '../../components/CarteChiffre';
import { BarreRecherche } from '../../components/BarreRecherche';
import { BoutonFlottant } from '../../components/BoutonFlottant';
import { Chargement } from '../../components/Chargement';
import { EtatVide } from '../../components/EtatVide';
import { EnTete } from '../../components/EnTete';
import { FeuilleModale } from '../../components/FeuilleModale';
import { Pastille } from '../../components/Pastille';
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
  // Le contexte fournit l'utilisateur et la déconnexion.
  const { utilisateur, deconnexion } = useAuth();
  // Ces états stockent les résultats, le chargement, l'erreur et l'aide "Rejoindre".
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState('');
  const [afficherAide, setAfficherAide] = useState(false);
  // Ces états filtrent localement les groupes déjà chargés.
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('Toutes');
  // Cet état ouvre la fenêtre de confirmation de déconnexion.
  const [confirmerDeconnexion, setConfirmerDeconnexion] = useState(false);

  // Cette fonction relit les tontines (chargement initial, geste ou bouton "Réessayer").
  const chargerTontines = useCallback(async (tirer = false) => {
    // Le geste d'actualisation affiche un indicateur distinct du chargement initial.
    if (tirer) setActualisation(true);
    // Les anciennes erreurs ne restent pas affichées après une nouvelle tentative.
    setErreur('');
    try {
      // La liste est demandée au backend avec le jeton courant.
      const resultat = await appelerApi<ReponseTontines>('/api/tontines');
      // Les deux formats de réponse sont convertis en liste.
      const liste = Array.isArray(resultat) ? resultat : resultat.tontines ?? [];
      setTontines(liste);
    } catch (cause) {
      // Une route absente équivaut à une liste vide.
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

  // Nom complet pour le bandeau, prénom pour le message de bienvenue.
  const nomUtilisateur = utilisateur?.nom ?? 'Mon compte';
  const prenom = utilisateur?.nom?.trim().split(/\s+/)[0] || '';

  // Filtrage local par nom et par statut.
  const tontinesFiltrees = tontines.filter((tontine) => {
    const correspondRecherche = tontine.nom.toLocaleLowerCase('fr-FR').includes(recherche.trim().toLocaleLowerCase('fr-FR'));
    const statut = (tontine.statut ?? '').toLowerCase();
    const correspondFiltre = filtre === 'Toutes' || (filtre === 'En préparation' && statut === 'en_preparation') || (filtre === 'En cours' && ['actif', 'en_cours'].includes(statut)) || (filtre === 'Terminées' && ['termine', 'terminée', 'terminee'].includes(statut));
    return correspondRecherche && correspondFiltre;
  });
  // Synthèses des cotisations prévues (l'app ne gère jamais l'argent).
  const totalPrevu = tontines.reduce((total, t) => total + Number(t.montant_cotisation ?? 0) * Number(t.nombre_membres ?? 0), 0);
  const nombreMembres = tontines.reduce((total, t) => total + Number(t.nombre_membres_inscrits ?? 0), 0);
  const placesDisponibles = tontines.reduce((total, t) => total + Math.max(0, Number(t.nombre_membres ?? 0) - Number(t.nombre_membres_inscrits ?? 0)), 0);

  // Bandeau bleu nuit réutilisé dans tous les états de l'écran : avatar cliquable vers le profil.
  const enTete = <EnTete mode="principal" titre={nomUtilisateur} sousTitre="Mes tontines" avatar={utilisateur?.photo} onDeconnexion={() => setConfirmerDeconnexion(true)} />;
  // Fenêtre de confirmation de déconnexion, réutilisée dans tous les états.
  const fenetreDeconnexion = <FeuilleModale visible={confirmerDeconnexion} titre="Se déconnecter ?" placement="centre" onFermer={() => setConfirmerDeconnexion(false)} pied={<View style={styles.actionsConfirmation}><Bouton titre="Annuler" variante="secondaire" onPress={() => setConfirmerDeconnexion(false)} /><Bouton titre="Se déconnecter" variante="danger" onPress={() => void deconnexion()} /></View>}>
    <Text style={styles.texteConfirmation}>Tu devras te reconnecter pour retrouver ton espace.</Text>
  </FeuilleModale>;

  // L'indicateur remplace l'écran pendant la première lecture.
  if (chargement) return <Chargement texte="Chargement de vos tontines…" />;

  // Erreur réseau sans aucune donnée : bandeau, message et bouton "Réessayer".
  if (erreur && tontines.length === 0) {
    return <View style={styles.ecran}>
      {enTete}
      <View style={styles.centre}>
        <Text style={styles.texteErreur}>{erreur}</Text>
        <Bouton titre="Réessayer" variante="secondaire" onPress={() => void chargerTontines(true)} />
      </View>
      {fenetreDeconnexion}
    </View>;
  }

  // Nouveau compte : aucune tontine, accueil épuré SANS statistiques ni filtres.
  if (tontines.length === 0) {
    return <View style={styles.ecran}>
      {enTete}
      <View style={styles.centre}>
        {/* Icône d'accueil. */}
        <Ionicons name="people-outline" size={64} color={couleurs.principal} />
        {/* Message de bienvenue avec le prénom. */}
        <Text style={styles.titreBienvenue}>Bienvenue{prenom ? `, ${prenom}` : ''} !</Text>
        <Text style={styles.texteBienvenue}>Vous n'avez pas encore de tontine. Créez la vôtre ou rejoignez celle d'un proche.</Text>
        {/* Action 1 : créer une tontine. */}
        <Bouton titre="Créer une tontine" onPress={() => router.push('/tontines/creer' as Href)} />
        {/* Action 2 : rejoindre (pas de lien d'invitation en V1, on explique). */}
        <Bouton titre="Rejoindre une tontine" variante="secondaire" onPress={() => setAfficherAide(true)} />
        {afficherAide && <Text style={styles.aide}>Demandez au gérant de vous ajouter avec votre numéro de téléphone. La tontine apparaîtra ici.</Text>}
      </View>
      {fenetreDeconnexion}
    </View>;
  }

  // Compte avec tontines : bandeau, statistiques, filtres et liste.
  return <View style={styles.ecran}>
    {enTete}
    <ScrollView style={styles.defilement} contentContainerStyle={styles.contenu} refreshControl={<RefreshControl refreshing={actualisation} onRefresh={() => void chargerTontines(true)} tintColor={couleurs.principal} colors={[couleurs.principal]} />}>
      {/* La recherche arrondie filtre les noms de tontine déjà chargés. */}
      <BarreRecherche value={recherche} onChangeText={setRecherche} placeholder="Rechercher une tontine..." />
      {/* Les indicateurs restent dans une grille de deux colonnes. */}
      <View style={styles.grilleChiffres}>
        <CarteChiffre titre="Tontines" valeur={tontines.length} icone="people-outline" variante="sombre" />
        <CarteChiffre titre="Cotisations prévues" valeur={formaterMontant(totalPrevu)} icone="checkmark-circle-outline" variante="succes" />
        <CarteChiffre titre="Membres inscrits" valeur={nombreMembres} icone="person-outline" variante="claire" />
        <CarteChiffre titre="Places disponibles" valeur={placesDisponibles} icone="person-add-outline" variante="claire" />
      </View>
      {/* Les filtres traduisent les états sans montrer les codes de base de données. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.zoneFiltres} contentContainerStyle={styles.filtres}>
        {['Toutes', 'En préparation', 'En cours', 'Terminées'].map((valeur) => <Pastille key={valeur} titre={valeur} active={filtre === valeur} onPress={() => setFiltre(valeur)} />)}
      </ScrollView>
      {/* Erreur lors d'un rafraîchissement : bandeau avec reprise. */}
      {!!erreur && <Carte style={styles.bandeauErreur}><Text style={styles.texteErreur}>{erreur}</Text><Bouton titre="Réessayer" variante="secondaire" onPress={() => void chargerTontines(true)} /></Carte>}
      {tontinesFiltrees.length > 0 ? <View style={styles.liste}>
        <Text style={styles.titreSection}>Mes tontines</Text>
        {tontinesFiltrees.map((tontine) => {
          // Ces nombres servent à la progression du groupe.
          const membres = tontine.nombre_membres_inscrits ?? 0;
          const capacite = tontine.nombre_membres ?? 0;
          const progression = capacite > 0 ? Math.min(1, membres / capacite) : 0;
          // Le lien rend toute la carte cliquable.
          return <Link key={tontine.id} href={{ pathname: '/tontines/[id]', params: { id: String(tontine.id) } } as Href} asChild><Pressable accessibilityRole="button" style={({ pressed }) => [styles.carteTappable, pressed && styles.appuye]}><Carte style={styles.carteTontine}>
            <View style={styles.ligneTitre}><Text style={styles.nomTontine}>{tontine.nom}</Text><Badge type="role" valeur={tontine.role_code ?? ''} /></View>
            <Badge type="statut" valeur={tontine.statut ?? ''} />
            <Text style={styles.information}>{tontine.montant_cotisation === undefined ? 'Montant non précisé' : formaterMontant(tontine.montant_cotisation)} · {libelleFrequence(tontine.frequence)}</Text>
            <Text style={styles.compteur}>{membres}/{capacite || '—'} membres</Text>
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: capacite, now: membres }} style={styles.fondProgression}><View style={[styles.progression, { width: `${progression * 100}%` }]} /></View>
          </Carte></Pressable></Link>;
        })}
      </View> : <Carte><EtatVide titre="Aucun résultat" texte="Essaie une autre recherche ou un autre filtre." /></Carte>}
    </ScrollView>
    {/* Le bouton rond flottant ouvre la création. */}
    <BoutonFlottant onPress={() => router.push('/tontines/creer' as Href)} />
    {fenetreDeconnexion}
  </View>;
}

// Ces styles s'appuient exclusivement sur le thème partagé.
const styles = StyleSheet.create({
  // flex: 1 suffit (pas de height en %, cause d'écrans vides sur le web).
  ecran: { flex: 1, width: '100%', backgroundColor: couleurs.fond },
  defilement: { flex: 1 },
  contenu: { flexGrow: 1, padding: espacements.moyen, gap: espacements.moyen, backgroundColor: couleurs.fond },
  // Zone centrée sous le bandeau pour le nouveau compte et pour l'erreur.
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: couleurs.fond },
  titreBienvenue: { fontSize: 22, fontWeight: '800', color: couleurs.texte, textAlign: 'center' },
  texteBienvenue: { fontSize: 15, color: couleurs.texteSecondaire, textAlign: 'center', maxWidth: 360 },
    // alignItems: 'flex-start' : les cartes gardent leur hauteur naturelle.
  grilleChiffres: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.petit, alignItems: 'flex-start' },
  // flexGrow: 0 : le défilement horizontal ne s'étire plus en hauteur.
  zoneFiltres: { flexGrow: 0, flexShrink: 0 },
  // alignItems: 'flex-start' : chaque pastille garde sa hauteur (42 px).
  filtres: { gap: espacements.petit, paddingVertical: espacements.minuscule, alignItems: 'flex-start' },
  
  bandeauErreur: { gap: espacements.petit, backgroundColor: couleurs.rougeClair },
  texteErreur: { color: couleurs.erreurFormulaire, fontSize: taillesTexte.secondaire, textAlign: 'center' },
  actionsConfirmation: { flexDirection: 'row', gap: espacements.petit },
  texteConfirmation: { color: couleurs.texteSecondaire, fontSize: taillesTexte.secondaire, lineHeight: 22, textAlign: 'center' },
  aide: { padding: espacements.moyen, color: couleurs.texteSecondaire, textAlign: 'center', maxWidth: 360 },
  liste: { gap: espacements.moyen },
  titreSection: { color: couleurs.principal, fontSize: taillesTexte.sousTitre, fontWeight: '700' },
  carteTappable: { borderRadius: 16 },
  appuye: { opacity: 0.82 },
  carteTontine: { gap: espacements.petit, borderRadius: 16 },
  ligneTitre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacements.petit },
  nomTontine: { flex: 1, color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '700' },
  information: { color: couleurs.texteSecondaire, fontSize: taillesTexte.secondaire },
  compteur: { color: couleurs.principal, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  fondProgression: { height: 5, overflow: 'hidden', borderRadius: 4, backgroundColor: couleurs.fondChamp },
  progression: { height: '100%', borderRadius: 4, backgroundColor: couleurs.accent },
});