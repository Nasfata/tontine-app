// React gère la saisie, les suggestions et les états des demandes.
import { useState } from 'react';
// React Native fournit les composants multiplateformes du formulaire.
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// expo-contacts lit les numéros du téléphone uniquement sur les plateformes natives.
import * as Contacts from 'expo-contacts';
// expo-crypto calcule les empreintes SHA-256 sans envoyer les numéros en clair.
import * as Crypto from 'expo-crypto';
// Expo Router fournit l'identifiant et la destination de retour au détail.
import { router, useLocalSearchParams, type Href } from 'expo-router';
// appelerApi envoie les empreintes ou l'ajout avec le jeton de session.
import { appelerApi, ErreurApi } from '../../api';
// Ces composants réutilisables harmonisent les champs, cartes, avatars et boutons.
import { Bouton } from '../../components/Bouton';
import { Avatar } from '../../components/Avatar';
import { Carte } from '../../components/Carte';
import { ChampTexte } from '../../components/ChampTexte';
// Le thème définit les messages et les espacements de cette page.
import { couleurs, espacements, taillesTexte } from '../../theme';

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
      <Carte style={styles.carte}>
        {/* Le titre annonce l'action de l'écran. */}
        <Text style={styles.titre}>Ajouter un membre</Text>
        {/* Le texte explique les deux méthodes disponibles. */}
        <Text style={styles.texte}>Choisis un contact ou saisis son numéro de téléphone.</Text>
        {/* Le bouton contacts est réservé aux plateformes natives. */}
        {Platform.OS !== 'web' && <Bouton titre="Choisir dans mes contacts" variante="secondaire" chargement={chargementContacts} onPress={() => void choisirDansMesContacts()} />}
        {/* Le navigateur utilise seulement le parcours de saisie manuelle. */}
        {Platform.OS === 'web' && <Text style={styles.infoWeb}>Les contacts ne sont pas accessibles sur le Web. Tu peux saisir un numéro ci-dessous.</Text>}
        {/* Le champ manuel reste disponible sur toutes les plateformes. */}
        <ChampTexte label="Téléphone" value={telephone} onChangeText={setTelephone} placeholder="Ex. +221 77 123 45 67" keyboardType="phone-pad" autoComplete="tel" returnKeyType="done" onSubmitEditing={() => void ajouterParTelephone()} />
        {/* Le bouton manuel appelle l'endpoint d'ajout par numéro. */}
        <Bouton titre="Ajouter" chargement={chargementAjout} onPress={() => void ajouterParTelephone()} />
        {/* Les refus de permission et erreurs sont expliqués sous le formulaire. */}
        {!!erreur && <View style={[styles.bandeau, invitation ? styles.bandeauInvitation : styles.bandeauErreur]} accessibilityRole="alert"><Text style={invitation ? styles.texteInvitation : styles.texteErreur}>{erreur}</Text></View>}
        {/* Les confirmations et résultats sans correspondance sont affichés ici. */}
        {!!succes && <View style={styles.bandeauSucces} accessibilityRole="alert"><Text style={styles.texteSucces}>{succes}</Text></View>}
      </Carte>
      {/* Les correspondances sont présentées en liste et restent sélectionnables. */}
      {suggestions.length > 0 && <Carte style={styles.carte}>
        {/* Le titre indique le but de la liste renvoyée par l'API. */}
        <Text style={styles.titreSection}>Suggestions de tes contacts</Text>
        {/* Chaque suggestion expose une action qui ajoute son identifiant. */}
        {suggestions.map((suggestion) => <View key={suggestion.id} style={styles.ligneSuggestion}>
          {/* L'avatar réutilisable affiche la photo ou une initiale. */}
          <Avatar nom={suggestion.nom} photo={suggestion.photo} taille={44} />
          {/* Le nom est la seule donnée d'identité exposée dans la suggestion. */}
          <Text style={styles.nomSuggestion}>{suggestion.nom}</Text>
          {/* Le bouton est désactivé et animé pendant l'ajout de cette personne. */}
          <Bouton titre="Ajouter" chargement={identifiantEnCours === suggestion.id} desactive={identifiantEnCours !== null && identifiantEnCours !== suggestion.id} onPress={() => void ajouterSuggestion(suggestion)} />
        </View>)}
      </Carte>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Ces styles reprennent la palette déjà utilisée dans les écrans d'authentification.
const styles = StyleSheet.create({
  // Le fond clair est commun aux plateformes.
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Le contenu est centré et défile avec le clavier.
  contenu: { flexGrow: 1, padding: espacements.moyen, gap: espacements.moyen },
  // Les cartes regroupent formulaire et suggestions.
  carte: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: espacements.moyen, borderRadius: 18 },
  // Le titre reprend la couleur sombre de la palette.
  titre: { color: couleurs.principal, fontSize: taillesTexte.titre, fontWeight: '700' },
  // Le texte explicatif utilise la couleur secondaire.
  texte: { color: couleurs.secondaire, fontSize: taillesTexte.secondaire, lineHeight: 22 },
  // Le navigateur affiche une note neutre au lieu d'une erreur.
  infoWeb: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.bleuClair, color: couleurs.principal, fontSize: taillesTexte.secondaire, lineHeight: 22 },
  // Le libellé décrit le champ manuel.
  libelle: { color: couleurs.principal, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  // Le bandeau commun donne un fond distinct aux messages d'action.
  bandeau: { padding: espacements.moyen, borderRadius: 12 },
  // Le bandeau d'erreur utilise le rouge du thème.
  bandeauErreur: { backgroundColor: couleurs.rougeClair },
  // Le texte d'erreur reprend le rouge accessible.
  texteErreur: { color: couleurs.erreur, fontSize: taillesTexte.secondaire, lineHeight: 21 },
  // L'invitation à venir reçoit un ton doré doux.
  bandeauInvitation: { backgroundColor: couleurs.ambreClair },
  // Le texte d'invitation reste contrasté sur fond clair.
  texteInvitation: { color: couleurs.principal, fontSize: taillesTexte.secondaire, lineHeight: 21 },
  // Le succès utilise un fond vert atténué.
  bandeauSucces: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.vertClair },
  // Le texte positif reprend le vert du thème.
  texteSucces: { color: couleurs.succes, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  // Le titre de liste distingue les suggestions du formulaire.
  titreSection: { color: couleurs.principal, fontSize: taillesTexte.sousTitre, fontWeight: '700' },
  // Chaque suggestion aligne l'avatar, le nom et le chargement.
  ligneSuggestion: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: espacements.petit, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: couleurs.bordure },
  // Le nom prend l'espace disponible dans la ligne.
  nomSuggestion: { flex: 1, color: couleurs.principal, fontSize: taillesTexte.secondaire, fontWeight: '600' },
});
