// React gère les valeurs du formulaire et ses états d'envoi.
import { useState } from 'react';
// React Native fournit les conteneurs adaptés au clavier mobile.
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router permet de créer un lien vers la connexion.
import { Link } from 'expo-router';
// AuthContext fournit l'action d'inscription et crée la session après succès.
import { useAuth } from '../AuthContext';
// Les composants communs évitent de répéter les styles des champs et du bouton.
import { Bouton } from '../components/Bouton';
import { ChampTexte } from '../components/ChampTexte';

// Cet écran crée un compte avec un nom, un téléphone et un mot de passe.
export default function Inscription() {
  // Ces états stockent les champs, l'erreur et le chargement.
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  // On récupère l'inscription du fournisseur global.
  const { inscription } = useAuth();
  // Cette fonction vérifie les champs avant de créer le compte.
  async function soumettre() {
    // Les champs vides sont signalés sans appeler l'API.
    if (!nom.trim() || !telephone.trim() || !motDePasse) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }
    // Le backend exige au moins six caractères pour le mot de passe.
    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    // On réinitialise le message et active le chargement du bouton.
    setErreur('');
    setChargement(true);
    try {
      // L'inscription sauvegarde aussi la session dans AuthContext.
      await inscription(nom.trim(), telephone.trim(), motDePasse);
    } catch (cause) {
      // Le message backend s'affiche sous le formulaire en cas d'échec.
      setErreur(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      // Le bouton est réactivé lorsque l'appel a terminé.
      setChargement(false);
    }
  }
  // Le clavier peut recouvrir le formulaire, qui reste alors défilable.
  return <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* ScrollView garantit l'accès aux champs sur les petits écrans. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* La carte regroupe tous les éléments d'inscription. */}
      <View style={styles.carte}>
        {/* Le titre annonce la création du compte. */}
        <Text style={styles.titre}>Créer un compte</Text>
        {/* Le champ nom utilise une capitalisation naturelle. */}
        <ChampTexte label="Nom" placeholder="Votre nom complet" value={nom} onChangeText={setNom} autoCapitalize="words" />
        {/* Le téléphone utilise le clavier numérique adapté. */}
        <ChampTexte label="Téléphone" placeholder="Votre numéro de téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
        {/* Le mot de passe est masqué et sa longueur vérifiée à l'envoi. */}
        <ChampTexte label="Mot de passe" placeholder="6 caractères minimum" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry returnKeyType="done" onSubmitEditing={() => void soumettre()} />
        {/* Les erreurs sont placées sous les champs pour rester visibles. */}
        {!!erreur && <Text style={styles.erreur} accessibilityRole="alert">{erreur}</Text>}
        {/* Le bouton reflète le chargement de l'inscription. */}
        <Bouton titre="S'inscrire" chargement={chargement} onPress={() => void soumettre()} />
        {/* Le lien ramène à l'écran de connexion. */}
        <Text style={styles.texteLien}>Déjà un compte ? <Link href="/connexion" style={styles.lien}>Se connecter</Link></Text>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Les styles reprennent les mêmes couleurs et proportions que la connexion.
const styles = StyleSheet.create({
  // L'écran occupe toute la surface disponible.
  ecran: { flex: 1, backgroundColor: '#F4F7FB' },
  // Le contenu reste centré et défilable selon la hauteur disponible.
  contenu: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  // La carte blanche porte le formulaire.
  carte: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 16 },
  // Le titre utilise la couleur principale de l'application.
  titre: { color: '#16324F', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  // L'erreur est affichée avec une couleur accessible et distincte.
  erreur: { color: '#B42318', fontSize: 14 },
  // Le texte du lien est centré sous le bouton.
  texteLien: { color: '#526579', textAlign: 'center', fontSize: 14 },
  // Le lien reprend la couleur principale des actions.
  lien: { color: '#1769AA', fontWeight: '700' },
});
