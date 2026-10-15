// React garde les champs contrôlés et l'état de soumission du formulaire.
import { useState } from 'react';
// React Native fournit un formulaire défilant et adapté au clavier des téléphones.
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router ouvre le détail une fois la création confirmée.
import { router, type Href } from 'expo-router';
// appelerApi transmet la requête de création au backend.
import { appelerApi } from '../../../../api';
// Les champs, carte et bouton assurent une apparence commune.
import { Bouton } from '../../../../components/Bouton';
import { Carte } from '../../../../components/Carte';
import { ChampTexte } from '../../../../components/ChampTexte';
// Les erreurs utilisent un bandeau visuel du thème.
import { couleurs, espacements, taillesTexte } from '../../../../theme';
// Le montant attendu suit le même format sur tous les écrans.
import { formaterMontant, libelleFrequence } from '../../../../libelles';

// Ces fréquences correspondent aux valeurs que l'API accepte.
type Frequence = 'quotidien' | 'hebdomadaire' | 'mensuel';
// La réponse du backend fournit l'identifiant du groupe créé.
type ReponseCreation = { id: number | string; statut?: string };
// Ces choix associent le code API à son unité de durée.
const frequences: { valeur: Frequence; unite: string }[] = [
  // La fréquence quotidienne compte les jours.
  { valeur: 'quotidien', unite: 'jours' },
  // La fréquence hebdomadaire compte les semaines.
  { valeur: 'hebdomadaire', unite: 'semaines' },
  // La fréquence mensuelle compte les mois.
  { valeur: 'mensuel', unite: 'mois' },
];

// Cet écran crée une tontine après validation des valeurs nécessaires.
export default function CreerTontine() {
  // Ces états contiennent le texte saisi par la personne.
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('');
  const [frequence, setFrequence] = useState<Frequence>('mensuel');
  const [nombreMembres, setNombreMembres] = useState('');
  const [regles, setRegles] = useState('');
  // Ces états indiquent l'envoi ou l'erreur à l'utilisateur.
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  // La virgule est acceptée comme séparateur décimal en français.
  const montantNumerique = Number(montant.replace(',', '.'));
  // Le nombre de membres sert au résumé et à la vérification.
  const membresNumerique = Number(nombreMembres);
  // L'unité se déduit de la fréquence choisie.
  const uniteCycle = frequences.find((choix) => choix.valeur === frequence)?.unite ?? 'mois';
  // La cagnotte attendue représente le montant d'une cotisation par membre.
  const cagnotte = montantNumerique > 0 && membresNumerique > 0 ? montantNumerique * membresNumerique : 0;
  // Cette fonction vérifie les champs avant d'envoyer la requête.
  async function creer() {
    // Le nom, le montant positif et deux membres minimum sont obligatoires.
    if (!nom.trim() || !Number.isFinite(montantNumerique) || montantNumerique <= 0 || !Number.isInteger(membresNumerique) || membresNumerique < 2) {
      setErreur('Renseigne un nom, un montant positif et au moins 2 membres.');
      return;
    }
    // Le nouveau message remplace toute erreur précédente.
    setErreur('');
    setChargement(true);
    try {
      // Les données envoyées conservent le contrat backend existant.
      const resultat = await appelerApi<ReponseCreation>('/api/tontines', { method: 'POST', body: JSON.stringify({ nom: nom.trim(), montant_cotisation: montantNumerique, frequence, nombre_membres: membresNumerique, regles: regles.trim() || null }) });
      // La réussite ouvre immédiatement le détail du groupe créé.
      router.replace({ pathname: '/tontines/[id]', params: { id: String(resultat.id) } } as Href);
    } catch (cause) {
      // Le message du backend est présenté dans un bandeau.
      setErreur(cause instanceof Error ? cause.message : 'Impossible de créer la tontine.');
    } finally {
      // Le bouton est réactivé à la fin de la requête.
      setChargement(false);
    }
  }
  // Le clavier mobile ne masque pas les champs et le pied d'action reste visible.
  return <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* Le contenu central défile au-dessus du bouton fixe. */}
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      {/* Le titre et les sections structurent le formulaire. */}
      <Text style={styles.titre}>Créer une tontine</Text>
      {/* La première carte regroupe le nom et le montant. */}
      <Carte style={styles.section}>
        {/* Le sous-titre introduit les informations générales. */}
        <Text style={styles.titreSection}>Informations générales</Text>
        {/* Le champ nom utilise le composant partagé. */}
        <ChampTexte label="Nom de la tontine" placeholder="Ex. Tontine familiale" value={nom} onChangeText={setNom} autoCapitalize="words" />
        {/* Le montant utilise le clavier numérique et précise la devise. */}
        <ChampTexte label="Cotisation par membre (FCFA)" placeholder="Ex. 5 000" value={montant} onChangeText={(valeur) => setMontant(valeur.replace(/\s/g, ''))} keyboardType="decimal-pad" />
      </Carte>
      {/* La deuxième carte regroupe la fréquence et la capacité. */}
      <Carte style={styles.section}>
        {/* Le sous-titre annonce les paramètres du cycle. */}
        <Text style={styles.titreSection}>Cycle et participants</Text>
        {/* Les boutons segmentés évitent un sélecteur natif non compatible web. */}
        <Text style={styles.libelle}>Fréquence</Text>
        <View style={styles.frequences}>
          {/* Chaque option garde le code API mais présente un libellé français. */}
          {frequences.map((choix) => <Pressable key={choix.valeur} accessibilityRole="button" accessibilityState={{ selected: frequence === choix.valeur }} onPress={() => setFrequence(choix.valeur)} style={[styles.boutonFrequence, frequence === choix.valeur && styles.frequenceActive]}><Text style={[styles.texteFrequence, frequence === choix.valeur && styles.texteFrequenceActif]}>{libelleFrequence(choix.valeur)}</Text></Pressable>)}
        </View>
        {/* Le nombre de participants doit être un entier supérieur ou égal à deux. */}
        <ChampTexte label="Nombre de membres" placeholder="Ex. 10" value={nombreMembres} onChangeText={setNombreMembres} keyboardType="number-pad" />
      </Carte>
      {/* Les règles facultatives sont séparées des paramètres obligatoires. */}
      <Carte style={styles.section}>
        {/* Le titre indique que ce champ peut être laissé vide. */}
        <Text style={styles.titreSection}>Règles (facultatif)</Text>
        {/* Le champ multiligne permet de décrire le fonctionnement du groupe. */}
        <ChampTexte label="Règles de fonctionnement" placeholder="Ajoute les règles de la tontine" value={regles} onChangeText={setRegles} multiline textAlignVertical="top" style={styles.champMultiligne} />
      </Carte>
      {/* Cette carte souligne les calculs qui suivent les saisies. */}
      <Carte style={styles.resume}>
        {/* Le résumé explique la durée estimée du cycle. */}
        <Text style={styles.titreResume}>Votre récapitulatif</Text>
        <Text style={styles.texteResume}>{membresNumerique > 0 ? membresNumerique : '…'} membres · {libelleFrequence(frequence).toLowerCase()} · cycle de {membresNumerique > 0 ? membresNumerique : '…'} {uniteCycle}</Text>
        {/* La cagnotte se met à jour en direct selon les champs. */}
        <Text style={styles.cagnotte}>Cagnotte attendue : {cagnotte > 0 ? formaterMontant(cagnotte) : '…'}</Text>
      </Carte>
      {/* Le message d'erreur est séparé du texte normal. */}
      {!!erreur && <View accessibilityRole="alert" style={styles.bandeauErreur}><Text style={styles.texteErreur}>{erreur}</Text></View>}
    </ScrollView>
    {/* Le pied d'action reste fixé sous le formulaire défilant. */}
    <View style={styles.pied}><Bouton titre="Créer la tontine" chargement={chargement} onPress={() => void creer()} /></View>
  </KeyboardAvoidingView>;
}

// Ces styles utilisent uniquement les couleurs et espacements du thème.
const styles = StyleSheet.create({
  // La page reprend le fond chaud et occupe toute la hauteur de l'onglet.
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Le formulaire reste défilable même lorsque le clavier est ouvert.
  contenu: { flexGrow: 1, padding: espacements.moyen, paddingBottom: espacements.petit, gap: espacements.moyen },
  // Le titre est aligné à gauche comme une page d'application native.
  titre: { color: couleurs.principal, fontSize: taillesTexte.titre, fontWeight: '700' },
  // Les cartes de section gardent une structure espacée.
  section: { gap: espacements.moyen, borderRadius: 18 },
  // Le titre de section reste distinct des libellés de champ.
  titreSection: { color: couleurs.principal, fontSize: taillesTexte.sousTitre, fontWeight: '700' },
  // Le libellé du sélecteur reprend la hiérarchie des champs.
  libelle: { color: couleurs.principal, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  // Les trois fréquences se répartissent en boutons segmentés.
  frequences: { flexDirection: 'row', gap: espacements.petit },
  // Une option inactive utilise un fond blanc et une bordure légère.
  boutonFrequence: { flex: 1, minHeight: 52, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacements.petit, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 12, backgroundColor: couleurs.carte },
  // L'option choisie est indiquée par l'accent doré doux.
  frequenceActive: { borderColor: couleurs.accent, backgroundColor: couleurs.ambreClair },
  // Le texte inactif reste gris et lisible.
  texteFrequence: { color: couleurs.secondaire, fontSize: taillesTexte.petit, fontWeight: '600', textAlign: 'center' },
  // Le texte actif reprend le bleu nuit.
  texteFrequenceActif: { color: couleurs.principal },
  // Le champ de règles dispose de plusieurs lignes.
  champMultiligne: { minHeight: 112, paddingTop: espacements.moyen },
  // La carte de résumé est visuellement mise en valeur.
  resume: { gap: espacements.petit, borderWidth: 1, borderColor: couleurs.ambreClair, backgroundColor: couleurs.ambreClair },
  // Le titre du résumé est marqué.
  titreResume: { color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '700' },
  // Le détail de durée reste secondaire.
  texteResume: { color: couleurs.secondaire, fontSize: taillesTexte.secondaire, lineHeight: 22 },
  // La cagnotte est mise en évidence sans code technique.
  cagnotte: { color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '700' },
  // Le message d'erreur utilise un bandeau coloré.
  bandeauErreur: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.rougeClair },
  // Le texte d'erreur est fortement contrasté.
  texteErreur: { color: couleurs.erreur, fontSize: taillesTexte.secondaire },
  // Le pied fixe distingue le bouton du contenu à faire défiler.
  pied: { paddingHorizontal: espacements.moyen, paddingTop: espacements.petit, paddingBottom: espacements.moyen, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: couleurs.bordure, backgroundColor: couleurs.fond },
});
