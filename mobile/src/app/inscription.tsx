// React gère les valeurs du formulaire et ses états d'envoi.
import { useState } from 'react';
// React Native fournit les conteneurs, le défilement et les champs de saisie.
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
// Expo Router permet de créer un lien vers la connexion.
import { Link } from 'expo-router';
// Ionicons fournit le logo et l'icône « afficher / masquer le mot de passe ».
import { Ionicons } from '@expo/vector-icons';
// AuthContext fournit l'action d'inscription et crée la session après succès.
import { useAuth } from '../AuthContext';
// Le thème fournit la couleur principale (bleu nuit) et les couleurs d'erreur.
import { couleurs } from '../theme';

// Bleu clair utilisé pour l'accent de la marque et le lien de connexion.
const BLEU_CLAIR = '#60A5FA';

// Sur le web, on fixe la hauteur de l'écran pour que le ScrollView puisse défiler.
const hauteurWeb = Platform.OS === 'web' ? ({ height: '100dvh' } as unknown as ViewStyle) : null;
// Sur le web, on retire le contour bleu du navigateur autour des champs.
const sansContourWeb = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

// Cet écran crée un compte avec un nom, un téléphone et un mot de passe.
export default function Inscription() {
  // Ces états stockent les champs, l'erreur et le chargement.
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [mdpVisible, setMdpVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  // On récupère l'inscription du fournisseur global.
  const { inscription } = useAuth();

  // Cette fonction vérifie les champs avant de créer le compte.
  async function soumettre() {
    // On ignore un second appui pendant qu'une requête est en cours.
    if (chargement) return;
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
    // On réinitialise le message et on active le chargement du bouton.
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

  return (
    // Le conteneur évite le clavier sur iOS et occupe tout l'écran.
    <KeyboardAvoidingView
      style={[styles.ecran, hauteurWeb]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Le ScrollView occupe l'écran : tout le contenu défile si l'espace manque. */}
      <ScrollView
        style={styles.defilement}
        contentContainerStyle={styles.contenu}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Le logo et le nom de l'application sont centrés en haut. */}
        <View style={styles.marque}>
          <View style={styles.logo}>
            <Ionicons name="people-outline" size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.titre}>
            <Text style={styles.titreAccent}>Ton</Text>tine
          </Text>
          <Text style={styles.sousTitre}>Gestion de tontines</Text>
        </View>

        {/* La carte blanche flotte au centre, avec des coins arrondis partout. */}
        <View style={styles.carte}>
          <Text style={styles.titreFormulaire}>Créer un compte</Text>

          {/* Champ nom avec une majuscule automatique à chaque mot. */}
          <View style={styles.groupe}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={[styles.champ, sansContourWeb]}
              placeholder="Votre nom complet"
              placeholderTextColor="#9CA3AF"
              value={nom}
              onChangeText={setNom}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
          </View>

          {/* Champ téléphone avec le clavier numérique adapté. */}
          <View style={styles.groupe}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={[styles.champ, sansContourWeb]}
              placeholder="Votre numéro de téléphone"
              placeholderTextColor="#9CA3AF"
              value={telephone}
              onChangeText={setTelephone}
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="next"
            />
          </View>

          {/* Champ mot de passe avec bouton œil pour l'afficher ou le masquer. */}
          <View style={styles.groupe}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.champMdp}>
              <TextInput
                style={[styles.champMdpTexte, sansContourWeb]}
                placeholder="6 caractères minimum"
                placeholderTextColor="#9CA3AF"
                value={motDePasse}
                onChangeText={setMotDePasse}
                secureTextEntry={!mdpVisible}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={() => void soumettre()}
              />
              <Pressable
                onPress={() => setMdpVisible((v) => !v)}
                style={styles.oeil}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={mdpVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                <Ionicons name={mdpVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#4B5563" />
              </Pressable>
            </View>
          </View>

          {/* Les erreurs sont placées sous les champs pour rester visibles. */}
          {!!erreur && (
            <View style={styles.bandeauErreur} accessibilityRole="alert">
              <Text style={styles.erreur}>{erreur}</Text>
            </View>
          )}

          {/* Le bouton affiche un indicateur et se désactive pendant l'appel. */}
          <Pressable
            onPress={() => void soumettre()}
            disabled={chargement}
            style={({ pressed }) => [styles.bouton, (pressed || chargement) && styles.boutonAtténué]}
            accessibilityRole="button"
          >
            {chargement ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.boutonTexte}>S'inscrire</Text>
            )}
          </Pressable>
        </View>

        {/* Le lien de connexion se place sous la carte, sur le fond bleu nuit. */}
        <Text style={styles.texteLien}>
          Déjà un compte ?{' '}
          <Link href="/connexion" style={styles.lien}>
            Se connecter
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Les styles sont identiques à ceux de l'écran de connexion.
const styles = StyleSheet.create({
  // L'écran occupe toute la surface disponible, sur fond bleu nuit.
  ecran: { flex: 1, width: '100%', backgroundColor: couleurs.principal },
  // Le ScrollView prend la hauteur de l'écran ; c'est lui qui défile.
  defilement: { flex: 1 },
  // Le contenu est centré verticalement et grandit si le contenu dépasse l'écran.
  contenu: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  // Le logo et le nom de marque sont centrés au-dessus de la carte.
  marque: { alignItems: 'center', gap: 8, paddingBottom: 28 },
  // Le carré arrondi donne une silhouette au logo.
  logo: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  // Le nom de l'application est blanc et fortement marqué.
  titre: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  // La première syllabe prend l'accent bleu clair.
  titreAccent: { color: BLEU_CLAIR },
  // Le sous-titre reste atténué sur le fond sombre.
  sousTitre: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500', letterSpacing: 1 },
  // La carte est blanche, arrondie sur les quatre coins et ne s'étire pas.
  carte: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 18,
  },
  // Le titre distingue la carte d'inscription.
  titreFormulaire: { color: '#111827', fontSize: 28, fontWeight: '800' },
  // Chaque groupe réunit un label et son champ.
  groupe: { gap: 8 },
  // Le label est en gras, au-dessus du champ.
  label: { color: '#374151', fontSize: 15, fontWeight: '600' },
  // Champ de saisie gris clair aux coins arrondis.
  champ: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F4F6FA',
    color: '#111827',
    fontSize: 16,
  },
  // Le champ mot de passe réunit la saisie et l'icône œil dans un même cadre.
  champMdp: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F4F6FA',
  },
  // La saisie occupe tout l'espace restant à gauche de l'œil.
  champMdpTexte: { flex: 1, height: '100%', paddingHorizontal: 16, color: '#111827', fontSize: 16 },
  // La zone de l'œil est assez grande pour être touchée au doigt.
  oeil: { height: '100%', paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  // Le message d'erreur dispose d'un fond rouge doux.
  bandeauErreur: { padding: 12, borderRadius: 12, backgroundColor: couleurs.rougeClair },
  // Le texte d'erreur reste accessible et contrasté.
  erreur: { color: couleurs.erreurFormulaire, fontSize: 14 },
  // Le bouton est bleu nuit, pleine largeur, à hauteur fixe.
  bouton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: couleurs.principal,
  },
  // Le bouton s'atténue au toucher et pendant la requête.
  boutonAtténué: { opacity: 0.75 },
  // Le texte du bouton est blanc et en gras.
  boutonTexte: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  // Le texte et le lien sont centrés sous la carte.
  texteLien: { marginTop: 24, textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  // Le lien prend le bleu clair de la marque, lisible sur fond sombre.
  lien: { color: BLEU_CLAIR, fontWeight: '700' },
});