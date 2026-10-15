// React gère la saisie du numéro et les états du formulaire.
import { useState } from 'react';
// React Native fournit clavier et défilement compatibles avec le Web et mobile.
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// Expo Router remplace cet écran par le détail après un ajout réussi.
import { router, useLocalSearchParams, type Href } from 'expo-router';
// appelerApi envoie la demande avec le jeton enregistré.
import { appelerApi, ErreurApi } from '../../api';
// Bouton réutilisable affiche l'indicateur de chargement.
import { Bouton } from '../../components/Bouton';

// Cette réponse confirme l'ajout au groupe.
type ReponseAjout = { message: string };

// Cet écran permet au gérant d'ajouter un membre par numéro de téléphone.
export default function AjouterMembre() {
  // L'identifiant de la tontine est transmis dans l'URL de cet écran.
  const { id } = useLocalSearchParams<{ id: string }>();
  // Ces états contrôlent le numéro saisi et les retours affichés.
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [invitation, setInvitation] = useState(false);
  // Cette fonction valide le numéro puis appelle la route d'ajout de membre.
  async function ajouter() {
    // Le numéro ne peut pas être vide ou composé uniquement d'espaces.
    if (!telephone.trim()) {
      setErreur('Saisis un numéro de téléphone.');
      setSucces('');
      setInvitation(false);
      return;
    }
    // On réinitialise les messages avant la demande.
    setErreur('');
    setSucces('');
    setInvitation(false);
    setChargement(true);
    try {
      // Le serveur normalise le numéro et vérifie le rôle, le compte et le quota.
      const resultat = await appelerApi<ReponseAjout>(`/api/tontines/${encodeURIComponent(id)}/membres`, {
        method: 'POST',
        body: JSON.stringify({ telephone: telephone.trim() }),
      });
      // Le message de succès est affiché brièvement avant le retour au détail.
      setSucces(resultat.message || 'Membre ajouté avec succès.');
      await new Promise((resoudre) => setTimeout(resoudre, 700));
      // Le paramètre de rafraîchissement force la relecture de la liste des membres.
      router.replace({ pathname: '/tontines/[id]', params: { id, rafraichir: String(Date.now()) } } as Href);
    } catch (cause) {
      // Une réponse avec invitation indique qu'aucun compte n'utilise ce numéro.
      if (cause instanceof ErreurApi && cause.invitation) {
        setInvitation(true);
        setErreur("Cette personne n'a pas encore de compte. Une invitation sera disponible bientôt.");
      } else {
        // Les erreurs d'autorisation, de doublon et de capacité sont affichées telles quelles.
        setErreur(cause instanceof Error ? cause.message : 'Impossible d’ajouter cette personne.');
      }
    } finally {
      // Le bouton est réactivé lorsque la requête est terminée.
      setChargement(false);
    }
  }
  // Le clavier mobile ne doit pas recouvrir le champ ou le bouton.
  return <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* La zone défilante conserve l'accès au formulaire sur les petits écrans. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* La carte contient le titre, la saisie et les retours serveur. */}
      <View style={styles.carte}>
        {/* Le titre précise l'action en cours. */}
        <Text style={styles.titre}>Ajouter un membre</Text>
        {/* L'explication indique le numéro à saisir. */}
        <Text style={styles.texte}>Saisis le numéro de téléphone associé au compte.</Text>
        {/* Le clavier téléphonique facilite la saisie sur mobile. */}
        <Text style={styles.libelle}>Téléphone</Text>
        <TextInput style={styles.champ} value={telephone} onChangeText={setTelephone} placeholder="Ex. +221 77 123 45 67" keyboardType="phone-pad" autoComplete="tel" returnKeyType="done" onSubmitEditing={() => void ajouter()} />
        {/* Les messages du serveur apparaissent sous le champ. */}
        {!!erreur && <Text style={[styles.erreur, invitation && styles.messageInvitation]} accessibilityRole="alert">{erreur}</Text>}
        {!!succes && <Text style={styles.succes} accessibilityRole="alert">{succes}</Text>}
        {/* Le bouton affiche le chargement et envoie la demande. */}
        <Bouton titre="Ajouter" chargement={chargement} onPress={() => void ajouter()} />
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Ces styles reprennent les couleurs et espacements déjà utilisés dans l'application.
const styles = StyleSheet.create({
  // L'écran utilise un fond clair sur les deux plateformes.
  ecran: { flex: 1, backgroundColor: '#F4F7FB' },
  // Le contenu reste centré et peut défiler avec le clavier ouvert.
  contenu: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  // La carte garde une largeur lisible sur tablette et navigateur.
  carte: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 14 },
  // Le titre reprend la couleur principale des écrans.
  titre: { color: '#16324F', fontSize: 25, fontWeight: '700' },
  // Le texte d'aide utilise la couleur secondaire.
  texte: { color: '#526579', fontSize: 15, lineHeight: 22 },
  // Le libellé identifie le champ de saisie.
  libelle: { color: '#263B50', fontSize: 14, fontWeight: '600' },
  // Le champ offre un espace confortable pour le numéro.
  champ: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D5DEE8', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#16324F', fontSize: 16 },
  // Les erreurs serveur sont signalées en rouge.
  erreur: { color: '#B42318', fontSize: 14, lineHeight: 21 },
  // Le message d'invitation garde le même texte mais un fond explicatif.
  messageInvitation: { padding: 12, borderRadius: 8, backgroundColor: '#FFF4E5', color: '#7A4B00' },
  // Le succès utilise une couleur verte accessible.
  succes: { color: '#18794E', fontSize: 14, fontWeight: '600' },
});
