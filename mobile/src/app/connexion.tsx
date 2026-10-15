// React gère les valeurs du formulaire et ses états d'envoi.
import { useState } from 'react';
// React Native fournit les conteneurs adaptés au clavier mobile.
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router permet de créer un lien vers l'inscription.
import { Link } from 'expo-router';
// AuthContext fournit l'action de connexion.
import { useAuth } from '../AuthContext';
// ChampTexte et Bouton appliquent les styles partagés des formulaires.
import { Bouton } from '../components/Bouton';
import { ChampTexte } from '../components/ChampTexte';

// Cet écran ouvre une session avec un téléphone et un mot de passe.
export default function Connexion() {
  // Ces états stockent les valeurs saisies et l'état de traitement.
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  // On récupère l'action de connexion auprès du fournisseur global.
  const { connexion } = useAuth();
  // Cette fonction valide les champs puis appelle le backend.
  async function soumettre() {
    // Les champs vides sont signalés avant tout appel réseau.
    if (!telephone.trim() || !motDePasse) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }
    // On efface l'erreur précédente et active l'indicateur du bouton.
    setErreur('');
    setChargement(true);
    try {
      // AuthContext sauvegarde le jeton et le profil après une réponse valide.
      await connexion(telephone.trim(), motDePasse);
    } catch (cause) {
      // Le message d'erreur renvoyé par le backend est affiché sous le formulaire.
      setErreur(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      // Le bouton retrouve son état normal lorsque la requête se termine.
      setChargement(false);
    }
  }
  // Le conteneur évite le clavier et rend le formulaire défilable sur petit écran.
  return <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* Le défilement garde les champs accessibles lorsque le clavier est ouvert. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* Le formulaire est centré dans un panneau simple et lisible. */}
      <View style={styles.carte}>
        {/* Le titre décrit l'action de l'écran. */}
        <Text style={styles.titre}>Connexion</Text>
        {/* Le champ téléphone utilise le clavier numérique adapté. */}
        <ChampTexte label="Téléphone" placeholder="Votre numéro de téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
        {/* Le mot de passe est masqué pendant la saisie. */}
        <ChampTexte label="Mot de passe" placeholder="Votre mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry returnKeyType="done" onSubmitEditing={() => void soumettre()} />
        {/* Les erreurs de validation ou du backend apparaissent sous les champs. */}
        {!!erreur && <Text style={styles.erreur} accessibilityRole="alert">{erreur}</Text>}
        {/* Le bouton montre un indicateur et se désactive pendant l'appel. */}
        <Bouton titre="Se connecter" chargement={chargement} onPress={() => void soumettre()} />
        {/* Le lien ouvre l'écran d'inscription. */}
        <Text style={styles.texteLien}>Pas encore de compte ? <Link href="/inscription" style={styles.lien}>S'inscrire</Link></Text>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Ces styles définissent le fond, les espacements et les couleurs communes.
const styles = StyleSheet.create({
  // L'écran occupe toute la surface disponible.
  ecran: { flex: 1, backgroundColor: '#F4F7FB' },
  // Le contenu reste centré et peut grandir sur un petit écran.
  contenu: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  // La carte blanche porte le formulaire.
  carte: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 16 },
  // Le titre utilise la couleur principale de l'application.
  titre: { color: '#16324F', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  // L'erreur est visible sans prendre la couleur principale.
  erreur: { color: '#B42318', fontSize: 14 },
  // Le texte et le lien sont centrés sous le bouton.
  texteLien: { color: '#526579', textAlign: 'center', fontSize: 14 },
  // Le lien reprend la couleur du bouton.
  lien: { color: '#1769AA', fontWeight: '700' },
});
