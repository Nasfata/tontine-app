// React gère le chargement du profil et les retours des formulaires.
import { useEffect, useState } from 'react';
// React Native fournit l'image et les conteneurs adaptés à toutes les plateformes.
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo ImagePicker ouvre la photothèque native ou le sélecteur du navigateur.
import * as ImagePicker from 'expo-image-picker';
// Le contexte fournit le profil local à actualiser après les modifications.
import { useAuth } from '../AuthContext';
// appelerApi gère les requêtes authentifiées et les réponses d'erreur.
import { appelerApi } from '../api';
// API_URL sert à former l'adresse complète de la photo téléversée.
import { API_URL } from '../config';
// Les contrôles partagés gardent le même style que les autres formulaires.
import { Bouton } from '../components/Bouton';
import { ChampTexte } from '../components/ChampTexte';

// Ces propriétés représentent le profil public renvoyé par le backend.
type ProfilUtilisateur = { id: number; nom: string; telephone: string; photo: string | null; date_creation?: string };
// Cette réponse correspond à la mise à jour des champs du profil.
type ReponseModification = { message: string; nom: string; telephone: string };
// Cette réponse correspond au téléversement d'une photo de profil.
type ReponsePhoto = { message: string; photo: string };

// Cet écran charge et permet de modifier les informations du compte.
export default function Profil() {
  // On peut actualiser le profil local lorsque le backend confirme la modification.
  const { utilisateur } = useAuth();
  // Ces états contiennent les données, les champs et les retours d'opération.
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [chargementPhoto, setChargementPhoto] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  // Le profil est lu depuis le backend à l'ouverture de l'écran.
  useEffect(() => {
    // Ce drapeau évite de modifier les états après démontage.
    let actif = true;
    // Cette fonction récupère le profil authentifié.
    async function chargerProfil() {
      try {
        // Le helper ajoute le jeton d'accès sauvegardé.
        const donnees = await appelerApi<ProfilUtilisateur>('/api/profil');
        // On applique la réponse uniquement si l'écran est encore affiché.
        if (actif) {
          setProfil(donnees);
          setNom(donnees.nom);
          setTelephone(donnees.telephone);
        }
      } catch (cause) {
        // Le message backend reste visible si la lecture échoue.
        if (actif) setErreur(cause instanceof Error ? cause.message : 'Impossible de charger le profil.');
      } finally {
        // Le formulaire est révélé après le chargement initial.
        if (actif) setChargement(false);
      }
    }
    // On démarre la lecture du profil au montage.
    void chargerProfil();
    // On empêche les mises à jour si l'écran est quitté.
    return () => { actif = false; };
  }, []);
  // Cette fonction sauvegarde les champs modifiés par PUT /api/profil.
  async function enregistrerProfil() {
    // Les champs requis sont vérifiés avant l'appel backend.
    if (!nom.trim() || !telephone.trim()) {
      setErreur('Le nom et le téléphone sont obligatoires.');
      setSucces('');
      return;
    }
    // On efface les anciens messages et désactive le bouton.
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      // Le backend met à jour le nom et le téléphone du compte courant.
      const resultat = await appelerApi<ReponseModification>('/api/profil', { method: 'PUT', body: JSON.stringify({ nom: nom.trim(), telephone: telephone.trim() }) });
      // Les valeurs affichées reflètent celles confirmées par le backend.
      setNom(resultat.nom);
      setTelephone(resultat.telephone);
      setProfil((courant) => courant ? { ...courant, nom: resultat.nom, telephone: resultat.telephone } : courant);
      // Un message confirme que les données sont sauvegardées.
      setSucces('Profil enregistré avec succès.');
    } catch (cause) {
      // Les erreurs du backend sont affichées au-dessus du bouton.
      setErreur(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le profil.');
    } finally {
      // Le bouton retrouve son état normal après la requête.
      setEnregistrement(false);
    }
  }
  // Cette fonction choisit une photo puis l'envoie sous le champ multipart « photo ».
  async function changerPhoto() {
    // On ouvre le sélecteur depuis une action déclenchée par l'utilisateur.
    setErreur('');
    setSucces('');
    try {
      // Le sélecteur ne propose que des images.
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      // Une fermeture ou une sélection vide ne déclenche aucun téléversement.
      if (selection.canceled || !selection.assets[0]) return;
      // Les informations du fichier choisi servent à construire la partie multipart.
      const image = selection.assets[0];
      const typeMime = image.mimeType ?? 'image/jpeg';
      const nomFichier = image.fileName ?? `photo-profil.${typeMime.split('/')[1] ?? 'jpg'}`;
      // Le formulaire multipart ne doit pas recevoir un Content-Type JSON.
      const formulaire = new FormData();
      // Le Web fournit un blob, tandis que React Native transmet une URI locale.
      if (Platform.OS === 'web') {
        // Le navigateur lit l'URI du fichier sélectionné sous forme de blob.
        const blob = await fetch(image.uri).then((reponse) => reponse.blob());
        // Le navigateur renseigne les en-têtes multipart à partir de ce blob.
        formulaire.append('photo', blob, nomFichier);
      } else {
        // React Native attend une partie fichier décrite par URI, nom et type MIME.
        formulaire.append('photo', { uri: image.uri, name: nomFichier, type: typeMime } as unknown as Blob);
      }
      // On affiche l'indicateur jusqu'à la fin du téléversement.
      setChargementPhoto(true);
      // Le backend stocke le fichier puis renvoie son chemin public.
      const resultat = await appelerApi<ReponsePhoto>('/api/profil/photo', { method: 'POST', body: formulaire });
      // L'image affichée est remplacée par le chemin confirmé par le serveur.
      setProfil((courant) => courant ? { ...courant, photo: resultat.photo } : courant);
      // Le retour utilisateur confirme l'enregistrement de la photo.
      setSucces('Photo de profil mise à jour.');
    } catch (cause) {
      // Les erreurs du sélecteur ou de l'API restent visibles à l'utilisateur.
      setErreur(cause instanceof Error ? cause.message : 'Impossible de modifier la photo.');
    } finally {
      // On arrête l'indicateur lorsque l'opération est terminée.
      setChargementPhoto(false);
    }
  }
  // Le démarrage affiche un indicateur pendant la lecture du profil.
  if (chargement) return <View style={styles.centre}><ActivityIndicator size="large" color="#1769AA" /></View>;
  // Le chemin relatif de la photo est complété avec l'adresse du backend.
  const uriPhoto = profil?.photo ? (profil.photo.startsWith('http') ? profil.photo : `${API_URL}${profil.photo}`) : null;
  // L'écran garde son contenu défilable lorsque le clavier est ouvert.
  return <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* ScrollView rend le formulaire accessible sur les petits écrans. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* La carte regroupe photo, champs et boutons. */}
      <View style={styles.carte}>
        {/* Le titre identifie clairement la page du compte. */}
        <Text style={styles.titre}>Mon profil</Text>
        {/* L'image du serveur est affichée, ou remplacée par l'initiale du nom. */}
        {uriPhoto ? <Image source={{ uri: uriPhoto }} style={styles.photo} /> : <View style={styles.initiale}><Text style={styles.texteInitiale}>{(profil?.nom ?? utilisateur?.nom ?? '?').charAt(0).toUpperCase()}</Text></View>}
        {/* Ce bouton déclenche le sélecteur et son état de chargement. */}
        <Bouton titre="Changer la photo" chargement={chargementPhoto} onPress={() => void changerPhoto()} />
        {/* Les champs modifiables reflètent les valeurs du profil. */}
        <ChampTexte label="Nom" placeholder="Votre nom" value={nom} onChangeText={setNom} autoCapitalize="words" />
        <ChampTexte label="Téléphone" placeholder="Votre téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
        {/* Les erreurs et confirmations apparaissent après les champs. */}
        {!!erreur && <Text style={styles.erreur} accessibilityRole="alert">{erreur}</Text>}
        {!!succes && <Text style={styles.succes} accessibilityRole="alert">{succes}</Text>}
        {/* Ce bouton enregistre les champs via PUT /api/profil. */}
        <Bouton titre="Enregistrer" chargement={enregistrement} onPress={() => void enregistrerProfil()} />
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Les styles utilisent la palette des écrans d'authentification.
const styles = StyleSheet.create({
  // L'écran occupe la surface disponible avec un fond doux.
  ecran: { flex: 1, backgroundColor: '#F4F7FB' },
  // Le contenu est centré et peut défiler avec le clavier.
  contenu: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  // La carte limite la largeur du formulaire sur grand écran.
  carte: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 16 },
  // L'indicateur de chargement est centré sur l'écran.
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' },
  // Le titre reprend la couleur principale sombre.
  titre: { color: '#16324F', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  // La photo est recadrée en cercle.
  photo: { width: 112, height: 112, alignSelf: 'center', borderRadius: 56, backgroundColor: '#EAF3FA' },
  // Le cercle de repli affiche l'initiale de l'utilisateur.
  initiale: { width: 112, height: 112, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', borderRadius: 56, backgroundColor: '#DCECF8' },
  // L'initiale reste lisible dans le cercle.
  texteInitiale: { color: '#1769AA', fontSize: 42, fontWeight: '700' },
  // Les erreurs utilisent une couleur rouge distincte.
  erreur: { color: '#B42318', fontSize: 14 },
  // Les confirmations utilisent une couleur verte accessible.
  succes: { color: '#18794E', fontSize: 14 },
});
