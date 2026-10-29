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
      {/* Le logo et le nom occupent le haut du fond bleu nuit. */}
      <View style={styles.marque}><View style={styles.logo}><Ionicons name="people-outline" size={42} color={couleurs.carte} /></View><Text style={styles.titre}>Tontine</Text><Text style={styles.sousTitre}>Gestion de tontines</Text></View>
      {/* La carte claire remonte depuis le bas et porte le formulaire. */}
      <Carte style={styles.carte}>
        {/* Le titre sépare l'identité de la zone de connexion. */}
        <Text style={styles.titreFormulaire}>Connexion</Text>
        {/* Le champ téléphone utilise le clavier numérique adapté. */}
        <ChampTexte label="Téléphone" obligatoire placeholder="Votre numéro de téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
        {/* Le mot de passe est masqué pendant la saisie. */}
        <ChampTexte label="Mot de passe" obligatoire placeholder="Votre mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry returnKeyType="done" onSubmitEditing={() => void soumettre()} />
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
  ecran: { flex: 1, width: '100%', backgroundColor: couleurs.principal },
  // Le logo reste en haut et la carte s'aligne vers le bas.
  contenu: { flexGrow: 1, justifyContent: 'space-between', paddingTop: 48 },
  // La carte blanche prend toute la largeur au bas de l'écran.
  carte: { width: '100%', alignSelf: 'stretch', gap: espacements.moyen, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingTop: 28, paddingHorizontal: espacements.grand, paddingBottom: espacements.grand },
  // Le logo et le nom de marque sont centrés dans le fond nuit.
  marque: { alignItems: 'center', gap: espacements.petit, paddingHorizontal: espacements.moyen, paddingBottom: espacements.grand },
  // Le carré arrondi donne une silhouette au logo sans nouvel asset.
  logo: { width: 76, height: 76, justifyContent: 'center', alignItems: 'center', borderRadius: 24, backgroundColor: couleurs.blancTranslucide },
  // Le nom de l'application est blanc et fortement marqué.
  titre: { color: couleurs.carte, fontSize: taillesTexte.grandTitre, fontWeight: '800' },
  // Le sous-titre reste atténué sur le fond sombre.
  sousTitre: { color: couleurs.texteEntete, fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  // Le titre distingue la carte de connexion.
  titreFormulaire: { color: couleurs.texte, fontSize: 30, fontWeight: '900' },
  // Le message d'erreur dispose d'un fond rouge doux.
  bandeauErreur: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.rougeClair },
  // Le texte d'erreur reste accessible et contrasté.
  erreur: { color: couleurs.erreurFormulaire, fontSize: taillesTexte.secondaire },
  // Le texte et le lien sont centrés sous le bouton.
  texteLien: { color: couleurs.texteSecondaire, textAlign: 'center', fontSize: taillesTexte.secondaire },
  // Le lien reprend la couleur du bouton.
  lien: { color: couleurs.principal, fontWeight: '700' },
});
