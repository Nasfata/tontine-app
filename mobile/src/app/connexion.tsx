// React gère les valeurs du formulaire et ses états d'envoi.
import { useState } from 'react';
// React Native fournit les conteneurs adaptés au clavier mobile.
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router permet de créer un lien vers l'inscription.
import { Link } from 'expo-router';
// Ionicons donne un repère de marque simple, sans image à charger.
import { Ionicons } from '@expo/vector-icons';
// AuthContext fournit l'action de connexion.
import { useAuth } from '../AuthContext';
// ChampTexte et Bouton appliquent les styles partagés des formulaires.
import { Bouton } from '../components/Bouton';
import { ChampTexte } from '../components/ChampTexte';
// La carte et le thème réutilisent le système visuel de l'application.
import { Carte } from '../components/Carte';
import { couleurs, espacements, taillesTexte } from '../theme';

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
      <Carte style={styles.carte}>
        {/* Le logo et le titre restent centrés au-dessus du formulaire. */}
        <View style={styles.marque}><Ionicons name="people-circle-outline" size={48} color={couleurs.accent} /><Text style={styles.titre}>Tontine</Text><Text style={styles.sousTitre}>Heureux de vous revoir</Text></View>
        {/* Le champ téléphone utilise le clavier numérique adapté. */}
        <ChampTexte label="Téléphone" placeholder="Votre numéro de téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
        {/* Le mot de passe est masqué pendant la saisie. */}
        <ChampTexte label="Mot de passe" placeholder="Votre mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry returnKeyType="done" onSubmitEditing={() => void soumettre()} />
        {/* Les erreurs de validation ou du backend apparaissent sous les champs. */}
        {!!erreur && <View style={styles.bandeauErreur} accessibilityRole="alert"><Text style={styles.erreur}>{erreur}</Text></View>}
        {/* Le bouton montre un indicateur et se désactive pendant l'appel. */}
        <Bouton titre="Se connecter" chargement={chargement} onPress={() => void soumettre()} />
        {/* Le lien ouvre l'écran d'inscription. */}
        <Text style={styles.texteLien}>Pas encore de compte ? <Link href="/inscription" style={styles.lien}>S'inscrire</Link></Text>
      </Carte>
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Ces styles définissent le fond, les espacements et les couleurs communes.
const styles = StyleSheet.create({
  // L'écran occupe toute la surface disponible.
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Le contenu reste centré et peut grandir sur un petit écran.
  contenu: { flexGrow: 1, justifyContent: 'center', padding: espacements.moyen },
  // La carte blanche porte le formulaire.
  carte: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: espacements.moyen, borderRadius: 18 },
  // Le titre utilise la couleur principale de l'application.
  titre: { color: couleurs.principal, fontSize: taillesTexte.grandTitre, fontWeight: '700' },
  // Le logo et la promesse sont centrés dans la carte.
  marque: { alignItems: 'center', gap: espacements.petit, paddingBottom: espacements.petit },
  // Le sous-titre reste gris et secondaire.
  sousTitre: { color: couleurs.secondaire, fontSize: taillesTexte.secondaire },
  // Le message d'erreur dispose d'un fond rouge doux.
  bandeauErreur: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.rougeClair },
  // Le texte d'erreur reste accessible et contrasté.
  erreur: { color: couleurs.erreur, fontSize: taillesTexte.secondaire },
  // Le texte et le lien sont centrés sous le bouton.
  texteLien: { color: couleurs.secondaire, textAlign: 'center', fontSize: taillesTexte.secondaire },
  // Le lien reprend la couleur du bouton.
  lien: { color: couleurs.principal, fontWeight: '700' },
});
