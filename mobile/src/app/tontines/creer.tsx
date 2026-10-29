// React garde les champs contrôlés et l'état de soumission du formulaire.
import { useState } from 'react';
// React Native fournit un formulaire défilant et adapté au clavier des téléphones.
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Expo Router ouvre le détail une fois la création confirmée.
import { router, type Href } from 'expo-router';
import { appelerApi } from '../../api';
import { Bouton } from '../../components/Bouton';
import { Carte } from '../../components/Carte';
import { FeuilleModale } from '../../components/FeuilleModale';
import { ChampTexte } from '../../components/ChampTexte';
import { couleurs, espacements, taillesTexte } from '../../theme';
import { formaterMontant, libelleFrequence } from '../../libelles';

// Ces fréquences correspondent aux valeurs que l'API accepte.
type Frequence = 'quotidien' | 'hebdomadaire' | 'mensuel';
// La réponse du backend fournit l'identifiant du groupe créé.
type ReponseCreation = { id: number | string; statut?: string };
// Ces choix associent le code API à son unité de durée.
const frequences: { valeur: Frequence; unite: string }[] = [
  { valeur: 'quotidien', unite: 'jours' },
  { valeur: 'hebdomadaire', unite: 'semaines' },
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

  // Ferme la feuille : retour arrière s'il existe un historique, sinon retour à la liste.
  // Évite l'erreur GO_BACK quand la page est ouverte directement ou rafraîchie sur le web.
  function fermer() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/accueil' as Href);
    }
  }

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
      const resultat = await appelerApi<ReponseCreation>('/api/tontines', {
        method: 'POST',
        body: JSON.stringify({
          nom: nom.trim(),
          montant_cotisation: montantNumerique,
          frequence,
          nombre_membres: membresNumerique,
          regles: regles.trim() || null,
        }),
      });
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

  // La route s'affiche dans une feuille qui monte depuis le bas. Pas de "pied" : le bouton est dans le formulaire.
  return (
    <FeuilleModale visible enRoute titre="Créer une tontine" onFermer={fermer}>
      {/* Le clavier ne masque pas les champs pendant leur saisie. */}
      <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Le formulaire défile ; paddingBottom laisse de la place sous le bouton. */}
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          {/* Première carte : nom et montant. */}
          <Carte style={styles.section}>
            <Text style={styles.titreSection}>Informations générales</Text>
            <ChampTexte
              label="Nom de la tontine"
              obligatoire
              placeholder="Ex. Tontine familiale"
              value={nom}
              onChangeText={setNom}
              autoCapitalize="words"
            />
            <ChampTexte
              label="Cotisation par membre (FCFA)"
              obligatoire
              placeholder="Ex. 5 000"
              value={montant}
              onChangeText={(valeur) => setMontant(valeur.replace(/\s/g, ''))}
              keyboardType="decimal-pad"
            />
          </Carte>

          {/* Deuxième carte : fréquence et capacité. */}
          <Carte style={styles.section}>
            <Text style={styles.titreSection}>Cycle et participants</Text>
            {/* Boutons segmentés : pas de sélecteur natif, compatible web. */}
            <Text style={styles.libelle}>
              Fréquence<Text style={styles.etoile}> *</Text>
            </Text>
            <View style={styles.frequences}>
              {frequences.map((choix) => (
                <Pressable
                  key={choix.valeur}
                  accessibilityRole="button"
                  accessibilityState={{ selected: frequence === choix.valeur }}
                  onPress={() => setFrequence(choix.valeur)}
                  style={[styles.boutonFrequence, frequence === choix.valeur && styles.frequenceActive]}
                >
                  <Text style={[styles.texteFrequence, frequence === choix.valeur && styles.texteFrequenceActif]}>
                    {libelleFrequence(choix.valeur)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ChampTexte
              label="Nombre de membres"
              obligatoire
              placeholder="Ex. 10"
              value={nombreMembres}
              onChangeText={setNombreMembres}
              keyboardType="number-pad"
            />
          </Carte>

          {/* Troisième carte : règles facultatives. */}
          <Carte style={styles.section}>
            <Text style={styles.titreSection}>Règles (facultatif)</Text>
            <ChampTexte
              label="Règles de fonctionnement"
              placeholder="Ajoute les règles de la tontine"
              value={regles}
              onChangeText={setRegles}
              multiline
              textAlignVertical="top"
              style={styles.champMultiligne}
            />
          </Carte>

          {/* Récapitulatif en direct. */}
          <Carte style={styles.resume}>
            <Text style={styles.titreResume}>Votre récapitulatif</Text>
            <Text style={styles.texteResume}>
              {membresNumerique > 0 ? membresNumerique : '…'} membres · {libelleFrequence(frequence).toLowerCase()} · cycle de{' '}
              {membresNumerique > 0 ? membresNumerique : '…'} {uniteCycle}
            </Text>
            <Text style={styles.cagnotte}>Cagnotte attendue : {cagnotte > 0 ? formaterMontant(cagnotte) : '…'}</Text>
          </Carte>

          {/* Message d'erreur éventuel. */}
          {!!erreur && (
            <View accessibilityRole="alert" style={styles.bandeauErreur}>
              <Text style={styles.texteErreur}>{erreur}</Text>
            </View>
          )}

          {/* BOUTON D'ENREGISTREMENT : dernier élément du formulaire, toujours atteignable. */}
          <Bouton titre="Créer la tontine" chargement={chargement} onPress={() => void creer()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </FeuilleModale>
  );
}

// Ces styles utilisent uniquement les couleurs et espacements du thème.
const styles = StyleSheet.create({
  // flex: 1 donne une hauteur réelle au formulaire dans la feuille.
  ecran: { flex: 1, width: '100%' },
  // paddingBottom: 120 : le bouton n'est jamais caché par la barre ou le clavier.
  contenu: { flexGrow: 1, padding: espacements.moyen, paddingBottom: 120, gap: espacements.moyen },
  section: { gap: espacements.moyen, borderRadius: 16 },
  titreSection: { color: couleurs.principal, fontSize: taillesTexte.sousTitre, fontWeight: '700' },
  libelle: { color: couleurs.principal, fontSize: taillesTexte.secondaire, fontWeight: '600' },
  etoile: { color: couleurs.erreurFormulaire },
  frequences: { flexDirection: 'row', gap: espacements.petit },
  boutonFrequence: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.petit,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: 12,
    backgroundColor: couleurs.carte,
  },
  frequenceActive: { borderColor: couleurs.accent, backgroundColor: couleurs.attenteClair },
  texteFrequence: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontWeight: '600', textAlign: 'center' },
  texteFrequenceActif: { color: couleurs.principal },
  champMultiligne: { minHeight: 112, paddingTop: espacements.moyen },
  resume: { gap: espacements.petit, borderWidth: 1, borderColor: couleurs.attenteClair, backgroundColor: couleurs.attenteClair },
  titreResume: { color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '700' },
  texteResume: { color: couleurs.texteSecondaire, fontSize: taillesTexte.secondaire, lineHeight: 22 },
  cagnotte: { color: couleurs.principal, fontSize: taillesTexte.corps, fontWeight: '700' },
  bandeauErreur: { padding: espacements.moyen, borderRadius: 12, backgroundColor: couleurs.rougeClair },
  texteErreur: { color: couleurs.erreurFormulaire, fontSize: taillesTexte.secondaire },
});