// React gère le chargement du profil et les retours des formulaires.
import { useEffect, useState } from 'react';
// React Native fournit l'image et les conteneurs adaptés à toutes les plateformes.
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo ImagePicker ouvre la photothèque native ou le sélecteur du navigateur.
import * as ImagePicker from 'expo-image-picker';
// Le contexte fournit le profil local à actualiser après les modifications.
import { useAuth } from '../AuthContext';
// appelerApi gère les requêtes authentifiées et les réponses d'erreur.
import { appelerApi } from '../api';
// API_URL sert à former l'adresse complète de la photo téléversée.
// Les composants partagés gardent le profil dans le même système visuel.
import { Bouton } from '../components/Bouton';
import { ChampTexte } from '../components/ChampTexte';
import { Avatar } from '../components/Avatar';
import { Carte } from '../components/Carte';
import { Chargement } from '../components/Chargement';
// Le bandeau d'identité et la fenêtre de confirmation sont communs à l'app.
import { EnTete } from '../components/EnTete';
import { FeuilleModale } from '../components/FeuilleModale';
// Le thème fournit les couleurs, les espaces et la hiérarchie typographique.
import { couleurs, espacements, taillesTexte } from '../theme';

// Ces propriétés représentent le profil public renvoyé par le backend.
type ProfilUtilisateur = { id: number; nom: string; telephone: string; photo: string | null; date_creation?: string };
// Cette réponse correspond à la mise à jour des champs du profil.
type ReponseModification = { message: string; nom: string; telephone: string };
// Cette réponse correspond au téléversement d'une photo de profil.
type ReponsePhoto = { message: string; photo: string };

// Cet écran charge et permet de modifier les informations du compte.
export default function Profil() {
  // On peut actualiser le profil local lorsque le backend confirme la modification.
  const { utilisateur, deconnexion } = useAuth();
  // Ces états contiennent les données, les champs et les retours d'opération.
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [chargementPhoto, setChargementPhoto] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [confirmerDeconnexion, setConfirmerDeconnexion] = useState(false);
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
  if (chargement) return <Chargement texte="Chargement du profil…" />;
  // L'écran utilise le grand bandeau d'identité et conserve les champs modifiables.
  return <View style={styles.ecran}>
    {/* Le profil reprend le bandeau sombre et son bouton de déconnexion. */}
    <EnTete mode="principal" titre={profil?.nom ?? utilisateur?.nom ?? 'Mon profil'} sousTitre="Mon profil" avatar={profil?.photo} onDeconnexion={() => setConfirmerDeconnexion(true)} />
    {/* Le clavier évite le recouvrement et le formulaire reste défilable. */}
    <KeyboardAvoidingView style={styles.conteneurFormulaire} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* ScrollView rend le formulaire accessible sur les petits écrans. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* La carte regroupe photo, champs et boutons. */}
      <Carte style={styles.carte}>
        {/* Le titre identifie clairement la page du compte. */}
        <Text style={styles.titre}>Mon profil</Text>
        {/* L'image du serveur est affichée, ou remplacée par l'initiale du nom. */}
        <Avatar nom={profil?.nom ?? utilisateur?.nom ?? '?'} photo={profil?.photo} taille={120} />
        {/* Ce bouton déclenche le sélecteur et son état de chargement. */}
        <Bouton titre="Changer la photo" chargement={chargementPhoto} onPress={() => void changerPhoto()} />
        {/* Les champs modifiables reflètent les valeurs du profil. */}
        <ChampTexte label="Nom" obligatoire placeholder="Votre nom" value={nom} onChangeText={setNom} autoCapitalize="words" />
        <ChampTexte label="Téléphone" obligatoire placeholder="Votre téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
        {/* Les erreurs et confirmations apparaissent après les champs. */}
        {!!erreur && <View style={styles.bandeauErreur} accessibilityRole="alert"><Text style={styles.erreur}>{erreur}</Text></View>}
        {!!succes && <View style={styles.bandeauSucces} accessibilityRole="alert"><Text style={styles.succes}>{succes}</Text></View>}
        {/* Ce bouton enregistre les champs via PUT /api/profil. */}
        <Bouton titre="Enregistrer" chargement={enregistrement} onPress={() => void enregistrerProfil()} />
      </Carte>
    </ScrollView>
    </KeyboardAvoidingView>
    {/* La confirmation centrée demande l'accord avant de fermer la session. */}
    <FeuilleModale visible={confirmerDeconnexion} titre="Se déconnecter ?" placement="centre" onFermer={() => setConfirmerDeconnexion(false)} pied={<View style={styles.actionsConfirmation}><Bouton titre="Annuler" variante="secondaire" onPress={() => setConfirmerDeconnexion(false)} /><Bouton titre="Se déconnecter" variante="danger" onPress={() => void deconnexion()} /></View>}>
      {/* Le détail rappelle que la session devra être ouverte à nouveau. */}
      <Text style={styles.texteConfirmation}>Tu devras te reconnecter pour retrouver ton espace.</Text>
    </FeuilleModale>
  </View>;
}

// Les styles utilisent la palette des écrans d'authentification.
const styles = StyleSheet.create({
  // L'écran occupe la surface disponible avec un fond doux.
  ecran: { flex: 1, width: '100%', backgroundColor: couleurs.fond },
  // Le formulaire occupe l'espace disponible sous le bandeau.
  conteneurFormulaire: { flex: 1 },
  // Le contenu est centré et peut défiler avec le clavier.
  contenu: { flexGrow: 1, padding: espacements.moyen, gap: espacements.moyen },
  // La carte limite la largeur du formulaire sur grand écran.
  carte: { width: '100%', alignSelf: 'stretch', alignItems: 'stretch', gap: espacements.moyen, borderRadius: 16 },
  // Le titre reprend la couleur principale sombre.
  titre: { color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: '800', textAlign: 'center' },
  // Les erreurs disposent d'un fond distinct et d'un texte contrasté.
  bandeauErreur: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.rougeClair },
  erreur: { color: couleurs.erreurFormulaire, fontSize: taillesTexte.secondaire },
  // Le succès est affiché dans un bandeau vert doux.
  bandeauSucces: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.vertClair },
  succes: { color: couleurs.succes, fontSize: taillesTexte.secondaire },
  // Les boutons de confirmation se partagent la largeur du panneau.
  actionsConfirmation: { flexDirection: 'row', gap: espacements.petit },
  // Le texte explique brièvement l'action.
  texteConfirmation: { color: couleurs.texteSecondaire, fontSize: taillesTexte.secondaire, lineHeight: 22 },
});
