// React gère la saisie, les suggestions et les états des demandes.
import { useState } from 'react';
// React Native fournit les composants multiplateformes du formulaire.
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// expo-contacts lit les numéros du téléphone uniquement sur les plateformes natives.
import * as Contacts from 'expo-contacts';
// expo-crypto calcule les empreintes SHA-256 sans envoyer les numéros en clair.
import * as Crypto from 'expo-crypto';
// Expo Router fournit l'identifiant et la destination de retour au détail.
import { router, useLocalSearchParams, type Href } from 'expo-router';
// appelerApi envoie les empreintes ou l'ajout avec le jeton de session.
import { appelerApi, ErreurApi } from '../../api';
// Bouton réutilisable affiche un indicateur pendant une action.
import { Bouton } from '../../components/Bouton';
// API_URL complète les chemins des photos utilisateur.
import { API_URL } from '../../config';

// Cette structure contient uniquement les données de suggestion autorisées par l'API.
type Suggestion = { id: number; nom: string; photo: string | null };
// La réponse est une liste de comptes correspondant aux empreintes du téléphone.
type ReponseCorrespondance = Suggestion[];
// La réponse confirme l'inscription du membre à la tontine.
type ReponseAjout = { message: string };
// Cette fonction retire les séparateurs comme la normalisation backend.
function normaliserTelephone(telephone: string) {
  // Le + initial est conservé et les espaces, points et tirets sont retirés.
  return telephone.trim().replace(/[\s.-]/g, '');
}

// Cet écran combine la saisie manuelle et les suggestions des contacts locaux.
export default function AjouterMembre() {
  // L'identifiant de tontine est transmis dans les paramètres de route.
  const { id } = useLocalSearchParams<{ id: string }>();
  // Ces états pilotent la saisie, les résultats et les indicateurs d'action.
  const [telephone, setTelephone] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chargementAjout, setChargementAjout] = useState(false);
  const [chargementContacts, setChargementContacts] = useState(false);
  const [identifiantEnCours, setIdentifiantEnCours] = useState<number | null>(null);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [invitation, setInvitation] = useState(false);
  // Cette fonction revient au détail et déclenche le rafraîchissement de sa liste.
  async function retournerAuDetail() {
    // Une courte pause laisse le message de succès apparaître avant la navigation.
    await new Promise((resoudre) => setTimeout(resoudre, 700));
    // Le paramètre change pour relancer la lecture des membres dans le détail.
    router.replace({ pathname: '/tontines/[id]', params: { id, rafraichir: String(Date.now()) } } as Href);
  }
  // Cette fonction ajoute une suggestion en envoyant son identifiant, jamais son téléphone.
  async function ajouterSuggestion(suggestion: Suggestion) {
    // On efface les anciens messages avant la demande.
    setErreur('');
    setSucces('');
    setInvitation(false);
    setIdentifiantEnCours(suggestion.id);
    try {
      // L'API d'ajout applique les mêmes contrôles de rôle et de capacité.
      const resultat = await appelerApi<ReponseAjout>(`/api/tontines/${encodeURIComponent(id)}/membres`, {
        method: 'POST',
        body: JSON.stringify({ utilisateurId: suggestion.id }),
      });
      // Le succès est montré avant le retour à la liste des membres actualisée.
      setSucces(resultat.message || 'Membre ajouté avec succès.');
      await retournerAuDetail();
    } catch (cause) {
      // L'erreur backend est affichée sous les suggestions.
      setErreur(cause instanceof Error ? cause.message : 'Impossible d’ajouter cette personne.');
    } finally {
      // Le bouton de suggestion retrouve son état normal après la demande.
      setIdentifiantEnCours(null);
    }
  }
  // Cette fonction ajoute un compte par le numéro saisi manuellement.
  async function ajouterParTelephone() {
    // Un numéro vide ne déclenche pas d'appel serveur.
    if (!telephone.trim()) {
      setErreur('Saisis un numéro de téléphone.');
      setSucces('');
      setInvitation(false);
      return;
    }
    // Les messages précédents sont effacés avant l'appel.
    setErreur('');
    setSucces('');
    setInvitation(false);
    setChargementAjout(true);
    try {
      // Le backend normalise le numéro puis vérifie l'appartenance et la capacité.
      const resultat = await appelerApi<ReponseAjout>(`/api/tontines/${encodeURIComponent(id)}/membres`, {
        method: 'POST',
        body: JSON.stringify({ telephone: normaliserTelephone(telephone) }),
      });
      // La confirmation reste visible juste avant la navigation de retour.
      setSucces(resultat.message || 'Membre ajouté avec succès.');
      await retournerAuDetail();
    } catch (cause) {
      // La réponse invitation affiche une explication dédiée à l'absence de compte.
      if (cause instanceof ErreurApi && cause.invitation) {
        setInvitation(true);
        setErreur("Cette personne n'a pas encore de compte. Une invitation sera disponible bientôt.");
      } else {
        // Les erreurs de rôle, de doublon ou de quota sont rendues visibles.
        setErreur(cause instanceof Error ? cause.message : 'Impossible d’ajouter cette personne.');
      }
    } finally {
      // Le bouton manuel est réactivé après la réponse.
      setChargementAjout(false);
    }
  }
  // Cette fonction demande l'accès aux contacts puis envoie des lots d'empreintes.
  async function choisirDansMesContacts() {
    // Le Web n'expose pas les contacts et reste utilisable via la saisie manuelle.
    if (Platform.OS === 'web') return;
    // On réinitialise les messages avant l'ouverture de la permission native.
    setErreur('');
    setSucces('');
    setChargementContacts(true);
    try {
      // Le système demande l'autorisation juste avant la première lecture des contacts.
      const permission = await Contacts.requestPermissionsAsync();
      // Le refus reçoit un message clair et la saisie manuelle reste disponible.
      if (!permission.granted) {
        setErreur('Autorise l’accès aux contacts dans les réglages pour afficher les suggestions. Tu peux aussi saisir un numéro manuellement.');
        return;
      }
      // Seuls les noms et numéros sont chargés depuis le répertoire local.
      const contacts = await Contacts.Contact.getAllDetails([Contacts.ContactField.FULL_NAME, Contacts.ContactField.PHONES]);
      // Les numéros sont normalisés et dédupliqués avant leur hachage.
      const numeros = Array.from(new Set(contacts.flatMap((contact) => (contact.phones ?? []).filter((phone) => typeof phone.number === 'string' && phone.number.length > 0).map((phone) => normaliserTelephone(phone.number!)).filter((numero) => numero.length > 0))));
      // Aucun numéro exploitable ne nécessite pas d'appel de correspondance.
      if (numeros.length === 0) {
        setErreur('Aucun numéro de téléphone trouvé dans tes contacts.');
        return;
      }
      // Les résultats de chaque lot sont réunis avant affichage.
      const correspondances: Suggestion[] = [];
      // Des lots de 100 bornent le calcul et la taille des requêtes réseau.
      const tailleLot = 100;
      // La boucle traite chaque numéro sans envoyer sa valeur au serveur.
      for (let debut = 0; debut < numeros.length; debut += tailleLot) {
        // On extrait le lot courant de numéros normalisés.
        const numerosLot = numeros.slice(debut, debut + tailleLot);
        // Les SHA-256 sont calculés localement avec Expo Crypto.
        const empreintes = await Promise.all(numerosLot.map((numero) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, numero)));
        // Seules les empreintes et l'identifiant de tontine traversent le réseau.
        const resultat = await appelerApi<ReponseCorrespondance>(`/api/contacts/correspondance?tontineId=${encodeURIComponent(id)}`, {
          method: 'POST',
          body: JSON.stringify({ empreintes }),
        });
        // On rassemble les comptes correspondants renvoyés par le backend.
        correspondances.push(...resultat);
      }
      // Les suggestions sont dédupliquées par identifiant avant leur affichage.
      setSuggestions(Array.from(new Map(correspondances.map((suggestion) => [suggestion.id, suggestion])).values()));
      // L'absence de correspondance est un résultat normal, pas une erreur.
      if (correspondances.length === 0) setSucces('Aucun contact inscrit correspondant à cette tontine.');
    } catch (cause) {
      // Une permission refusée ou un problème réseau laisse le formulaire manuel accessible.
      setErreur(cause instanceof Error ? cause.message : 'Impossible de lire les contacts.');
    } finally {
      // Le bouton des contacts retrouve son état normal après les lots.
      setChargementContacts(false);
    }
  }
  // L'écran reste défilable et évite le clavier mobile.
  return <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* Le défilement garde la saisie manuelle accessible avec le clavier ouvert. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* La carte contient l'action contacts et le formulaire manuel. */}
      <View style={styles.carte}>
        {/* Le titre annonce l'action de l'écran. */}
        <Text style={styles.titre}>Ajouter un membre</Text>
        {/* Le texte explique les deux méthodes disponibles. */}
        <Text style={styles.texte}>Choisis un contact ou saisis son numéro de téléphone.</Text>
        {/* Le bouton contacts est réservé aux plateformes natives. */}
        {Platform.OS !== 'web' && <Bouton titre="Choisir dans mes contacts" chargement={chargementContacts} onPress={() => void choisirDansMesContacts()} />}
        {/* Le navigateur utilise seulement le parcours de saisie manuelle. */}
        {Platform.OS === 'web' && <Text style={styles.infoWeb}>Les contacts ne sont pas accessibles sur le Web. Tu peux saisir un numéro ci-dessous.</Text>}
        {/* Le champ manuel reste disponible sur toutes les plateformes. */}
        <Text style={styles.libelle}>Téléphone</Text>
        <TextInput style={styles.champ} value={telephone} onChangeText={setTelephone} placeholder="Ex. +221 77 123 45 67" keyboardType="phone-pad" autoComplete="tel" returnKeyType="done" onSubmitEditing={() => void ajouterParTelephone()} />
        {/* Le bouton manuel appelle l'endpoint d'ajout par numéro. */}
        <Bouton titre="Ajouter" chargement={chargementAjout} onPress={() => void ajouterParTelephone()} />
        {/* Les refus de permission et erreurs sont expliqués sous le formulaire. */}
        {!!erreur && <Text style={[styles.erreur, invitation && styles.messageInvitation]} accessibilityRole="alert">{erreur}</Text>}
        {/* Les confirmations et résultats sans correspondance sont affichés ici. */}
        {!!succes && <Text style={styles.succes} accessibilityRole="alert">{succes}</Text>}
      </View>
      {/* Les correspondances sont présentées en liste et restent sélectionnables. */}
      {suggestions.length > 0 && <View style={styles.carte}>
        {/* Le titre indique le but de la liste renvoyée par l'API. */}
        <Text style={styles.titreSection}>Suggestions de tes contacts</Text>
        {/* Chaque suggestion expose une action qui ajoute son identifiant. */}
        {suggestions.map((suggestion) => {
          // Le chemin relatif de la photo est complété avec l'adresse API.
          const photo = suggestion.photo ? (suggestion.photo.startsWith('http') ? suggestion.photo : `${API_URL}${suggestion.photo}`) : null;
          // La ligne est désactivée pendant l'ajout de cette suggestion.
          return <Pressable key={suggestion.id} accessibilityRole="button" disabled={identifiantEnCours !== null} onPress={() => void ajouterSuggestion(suggestion)} style={styles.ligneSuggestion}>
            {/* La photo est remplacée par une initiale si le compte n'en a pas. */}
            {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <View style={styles.initiale}><Text style={styles.texteInitiale}>{suggestion.nom.charAt(0).toUpperCase()}</Text></View>}
            {/* Le nom est la seule donnée d'identité affichée dans la suggestion. */}
            <Text style={styles.nomSuggestion}>{suggestion.nom}</Text>
            {/* Le compte sélectionné montre un indicateur de traitement. */}
            {identifiantEnCours === suggestion.id && <ActivityIndicator color="#1769AA" />}
          </Pressable>;
        })}
      </View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Ces styles reprennent la palette déjà utilisée dans les écrans d'authentification.
const styles = StyleSheet.create({
  // Le fond clair est commun aux plateformes.
  ecran: { flex: 1, backgroundColor: '#F4F7FB' },
  // Le contenu est centré et défile avec le clavier.
  contenu: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  // Les cartes regroupent formulaire et suggestions.
  carte: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 14 },
  // Le titre reprend la couleur sombre de la palette.
  titre: { color: '#16324F', fontSize: 25, fontWeight: '700' },
  // Le texte explicatif utilise la couleur secondaire.
  texte: { color: '#526579', fontSize: 14, lineHeight: 21 },
  // Le navigateur affiche une note neutre au lieu d'une erreur.
  infoWeb: { padding: 12, borderRadius: 9, backgroundColor: '#EAF3FA', color: '#263B50', fontSize: 14, lineHeight: 21 },
  // Le libellé décrit le champ manuel.
  libelle: { color: '#263B50', fontSize: 14, fontWeight: '600' },
  // Le champ conserve une taille confortable sur téléphone.
  champ: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D5DEE8', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#16324F', fontSize: 16 },
  // Les erreurs s'affichent en rouge sous le champ.
  erreur: { color: '#B42318', fontSize: 14, lineHeight: 21 },
  // Le refus contacts reçoit un fond doux et un texte brun lisible.
  messageInvitation: { padding: 12, borderRadius: 8, backgroundColor: '#FFF4E5', color: '#7A4B00' },
  // Les messages positifs utilisent une couleur verte accessible.
  succes: { color: '#18794E', fontSize: 14, fontWeight: '600' },
  // Le titre de liste distingue les suggestions du formulaire.
  titreSection: { color: '#16324F', fontSize: 19, fontWeight: '700' },
  // Chaque suggestion aligne l'avatar, le nom et le chargement.
  ligneSuggestion: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EDF1F5' },
  // Les photos apparaissent en petits cercles.
  photo: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EAF3FA' },
  // Le cercle de repli contient l'initiale du compte.
  initiale: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 21, backgroundColor: '#DCECF8' },
  // L'initiale reprend le bleu principal.
  texteInitiale: { color: '#1769AA', fontSize: 18, fontWeight: '700' },
  // Le nom prend l'espace disponible dans la ligne.
  nomSuggestion: { flex: 1, color: '#263B50', fontSize: 15, fontWeight: '600' },
});
