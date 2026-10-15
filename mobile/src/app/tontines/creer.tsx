// React gère les champs contrôlés et l'état de soumission du formulaire.
import { useState } from 'react';
// React Native fournit le clavier et les composants compatibles web/mobile.
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// Expo Router construit la destination dynamique après la création.
import { router, type Href } from 'expo-router';
// appelerApi envoie les données au backend avec le jeton courant.
import { appelerApi } from '../../api';
// Ces fréquences correspondent aux choix acceptés par le backend.
type Frequence = 'quotidien' | 'hebdomadaire' | 'mensuel';
// Cette réponse fournit l'identifiant de la tontine créée.
type ReponseCreation = { id: number | string; statut?: string };
// Ces choix traduisent les fréquences techniques en libellés d'interface.
const frequences: { valeur: Frequence; libelle: string; unite: string }[] = [
  // La fréquence quotidienne produit une durée en jours.
  { valeur: 'quotidien', libelle: 'Quotidien', unite: 'jours' },
  // La fréquence hebdomadaire produit une durée en semaines.
  { valeur: 'hebdomadaire', libelle: 'Hebdomadaire', unite: 'semaines' },
  // La fréquence mensuelle produit une durée en mois.
  { valeur: 'mensuel', libelle: 'Mensuel', unite: 'mois' },
];

// Cet écran recueille les informations nécessaires à la création d'une tontine.
export default function CreerTontine() {
  // Ces états stockent les champs tels qu'ils sont saisis dans le formulaire.
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('');
  const [frequence, setFrequence] = useState<Frequence>('mensuel');
  const [nombreMembres, setNombreMembres] = useState('');
  const [regles, setRegles] = useState('');
  // Ces états indiquent l'activité et les messages affichés sous le formulaire.
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  // Le montant accepte la virgule comme séparateur décimal.
  const montantNumerique = Number(montant.replace(',', '.'));
  // Le nombre de membres sert au calcul en direct et à la validation.
  const membresNumerique = Number(nombreMembres);
  // L'unité de durée dépend de la fréquence sélectionnée.
  const uniteCycle = frequences.find((choix) => choix.valeur === frequence)?.unite ?? 'mois';
  // La cagnotte théorique est calculée à partir des deux valeurs numériques.
  const cagnotte = montantNumerique > 0 && membresNumerique > 0 ? montantNumerique * membresNumerique : 0;
  // Cette fonction vérifie les champs avant d'envoyer le POST.
  async function creer() {
    // Les valeurs incorrectes sont signalées avant l'appel réseau.
    if (!nom.trim() || !Number.isFinite(montantNumerique) || montantNumerique <= 0 || !Number.isInteger(membresNumerique) || membresNumerique < 2) {
      setErreur('Renseigne un nom, un montant positif et au moins 2 membres.');
      return;
    }
    // On efface l'erreur précédente avant de lancer la requête.
    setErreur('');
    setChargement(true);
    try {
      // Le backend attend un montant et un nombre de membres numériques.
      const resultat = await appelerApi<ReponseCreation>('/api/tontines', {
        method: 'POST',
        body: JSON.stringify({ nom: nom.trim(), montant_cotisation: montantNumerique, frequence, nombre_membres: membresNumerique, regles: regles.trim() || null }),
      });
      // L'utilisateur arrive sur le détail de la tontine créée.
      router.replace({ pathname: '/tontines/[id]', params: { id: String(resultat.id) } } as Href);
    } catch (cause) {
      // Le message renvoyé par le backend est présenté dans le formulaire.
      setErreur(cause instanceof Error ? cause.message : 'Impossible de créer la tontine.');
    } finally {
      // Le bouton redevient disponible lorsque le POST est terminé.
      setChargement(false);
    }
  }
  // Le formulaire reste défilable lorsque le clavier mobile est ouvert.
  return <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* Le contenu défilant évite que le clavier masque les derniers champs. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* La carte regroupe les champs et les calculs prévisionnels. */}
      <View style={styles.carte}>
        {/* Le titre donne le contexte de l'écran. */}
        <Text style={styles.titre}>Créer une tontine</Text>
        {/* Le nom est obligatoire et ne contient qu'une ligne. */}
        <Text style={styles.libelle}>Nom de la tontine</Text>
        <TextInput style={styles.champ} value={nom} onChangeText={setNom} placeholder="Ex. Tontine familiale" />
        {/* Le montant utilise un clavier numérique avec un suffixe en FCFA. */}
        <Text style={styles.libelle}>Montant de la cotisation</Text>
        <View style={styles.champMontant}>
          <TextInput style={styles.saisieMontant} value={montant} onChangeText={setMontant} placeholder="Ex. 5000" keyboardType="decimal-pad" />
          <Text style={styles.suffixe}>FCFA</Text>
        </View>
        {/* Les trois boutons évitent un sélecteur natif incompatible avec le Web. */}
        <Text style={styles.libelle}>Fréquence</Text>
        <View style={styles.choixFrequence}>
          {/* Chaque fréquence est un bouton tactile et accessible sur les deux plateformes. */}
          {frequences.map((choix) => <Pressable key={choix.valeur} accessibilityRole="button" accessibilityState={{ selected: frequence === choix.valeur }} onPress={() => setFrequence(choix.valeur)} style={[styles.boutonFrequence, frequence === choix.valeur && styles.boutonFrequenceActif]}>
            {/* Le libellé indique la fréquence choisie. */}
            <Text style={[styles.texteFrequence, frequence === choix.valeur && styles.texteFrequenceActif]}>{choix.libelle}</Text>
          </Pressable>)}
        </View>
        {/* Le nombre de membres est un entier d'au moins deux personnes. */}
        <Text style={styles.libelle}>Nombre de membres</Text>
        <TextInput style={styles.champ} value={nombreMembres} onChangeText={setNombreMembres} placeholder="Ex. 10" keyboardType="number-pad" />
        {/* Les règles restent facultatives et peuvent occuper plusieurs lignes. */}
        <Text style={styles.libelle}>Règles (facultatif)</Text>
        <TextInput style={[styles.champ, styles.champMultiligne]} value={regles} onChangeText={setRegles} placeholder="Ajoute les règles de fonctionnement" multiline textAlignVertical="top" />
        {/* Les calculs sont actualisés à chaque modification des champs. */}
        <View style={styles.resume}>
          <Text style={styles.titreResume}>Prévision</Text>
          <Text style={styles.texteResume}>{membresNumerique > 0 ? membresNumerique : '…'} membres x {frequence} = {membresNumerique > 0 ? membresNumerique : '…'} {uniteCycle}</Text>
          <Text style={styles.texteResume}>Cagnotte attendue : {cagnotte > 0 ? new Intl.NumberFormat('fr-FR').format(cagnotte) : '…'} FCFA</Text>
        </View>
        {/* Les erreurs backend et les validations apparaissent sous le résumé. */}
        {!!erreur && <Text style={styles.erreur} accessibilityRole="alert">{erreur}</Text>}
        {/* Le bouton indique l'envoi en cours et déclenche la création. */}
        <Pressable accessibilityRole="button" disabled={chargement} onPress={() => void creer()} style={[styles.boutonCreer, chargement && styles.boutonDesactive]}>
          {/* Le texte change pendant l'envoi pour informer l'utilisateur. */}
          <Text style={styles.texteCreer}>{chargement ? 'Création…' : 'Créer'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

// Ces styles forment un formulaire lisible et identique sur le Web et mobile.
const styles = StyleSheet.create({
  // Le fond doux remplit la fenêtre.
  ecran: { flex: 1, backgroundColor: '#F4F7FB' },
  // Le contenu peut s'étendre et défiler selon la taille d'écran.
  contenu: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  // La carte limite la largeur du formulaire sur grand écran.
  carte: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 10 },
  // Le titre reprend la couleur principale de l'application.
  titre: { marginBottom: 8, color: '#16324F', fontSize: 26, fontWeight: '700' },
  // Les libellés restent visibles au-dessus des champs.
  libelle: { marginTop: 6, color: '#263B50', fontSize: 14, fontWeight: '600' },
  // Le champ standard offre une zone de saisie confortable.
  champ: { minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D5DEE8', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#16324F', fontSize: 16 },
  // Le montant et son suffixe sont alignés dans une seule bordure.
  champMontant: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D5DEE8', borderRadius: 10, paddingHorizontal: 14 },
  // La saisie du montant prend toute la place disponible.
  saisieMontant: { flex: 1, minHeight: 46, color: '#16324F', fontSize: 16 },
  // Le suffixe distingue clairement la devise.
  suffixe: { color: '#526579', fontSize: 14, fontWeight: '700' },
  // Les boutons de fréquence se répartissent sur la largeur.
  choixFrequence: { flexDirection: 'row', gap: 8 },
  // Le bouton non sélectionné utilise une bordure neutre.
  boutonFrequence: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderWidth: 1, borderColor: '#D5DEE8', borderRadius: 9, backgroundColor: '#FFFFFF' },
  // La fréquence active est signalée par un fond bleu pâle.
  boutonFrequenceActif: { borderColor: '#1769AA', backgroundColor: '#EAF3FA' },
  // Le libellé normal est de couleur secondaire.
  texteFrequence: { color: '#526579', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  // Le libellé actif reprend la couleur principale.
  texteFrequenceActif: { color: '#1769AA' },
  // Le champ multiligne offre une hauteur adaptée aux règles.
  champMultiligne: { minHeight: 96, paddingTop: 12 },
  // Le résumé sépare visuellement les valeurs calculées.
  resume: { marginTop: 8, padding: 14, borderRadius: 10, backgroundColor: '#EAF3FA', gap: 5 },
  // Le titre du résumé est accentué.
  titreResume: { color: '#16324F', fontSize: 15, fontWeight: '700' },
  // Les lignes du résumé restent lisibles sur fond bleu clair.
  texteResume: { color: '#263B50', fontSize: 14, lineHeight: 21 },
  // Les erreurs apparaissent en rouge sous les calculs.
  erreur: { color: '#B42318', fontSize: 14 },
  // Le bouton d'envoi reprend le bleu des autres écrans.
  boutonCreer: { minHeight: 50, justifyContent: 'center', alignItems: 'center', marginTop: 4, borderRadius: 10, backgroundColor: '#1769AA' },
  // L'état désactivé réduit légèrement l'opacité du bouton.
  boutonDesactive: { opacity: 0.65 },
  // Le texte du bouton garde un contraste élevé.
  texteCreer: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
