// React gère les champs du formulaire et le mode inscription.
import { useState } from 'react';
// Ces composants natifs fonctionnent sur mobile et sur le web.
import { ActivityIndicator, Button, Text, TextInput, View } from 'react-native';
// Le contexte déclenche les appels d'inscription et de connexion.
import { useAuth } from '../AuthContext';

// Cet écran propose un formulaire de connexion et d'inscription.
export default function Connexion() {
  // Les valeurs du formulaire restent dans l'état local de l'écran.
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  // Le mode inscription ajoute le champ du nom au formulaire.
  const [modeInscription, setModeInscription] = useState(false);
  // Ces états affichent l'erreur backend et désactivent le formulaire pendant l'envoi.
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  // Les actions de session sont fournies par le contexte global.
  const { inscription, connexion } = useAuth();
  // Cette fonction envoie le formulaire au point d'API correspondant au mode choisi.
  async function soumettre() {
    // On efface l'ancienne erreur avant de tenter la requête.
    setErreur('');
    setEnvoi(true);
    try {
      // On crée un compte ou on ouvre une session avec les champs fournis.
      if (modeInscription) await inscription(nom, telephone, motDePasse);
      else await connexion(telephone, motDePasse);
    } catch (cause) {
      // Le message renvoyé par l'API est présenté directement à l'utilisateur.
      setErreur(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      // Le formulaire redevient actif lorsque la requête est terminée.
      setEnvoi(false);
    }
  }
  // Le formulaire garde volontairement une présentation minimale.
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{modeInscription ? 'Créer un compte' : 'Connexion'}</Text>
    {modeInscription && <TextInput placeholder="Nom" value={nom} onChangeText={setNom} autoCapitalize="words" />}
    <TextInput placeholder="Téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
    <TextInput placeholder="Mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry />
    {!!erreur && <Text accessibilityRole="alert">{erreur}</Text>}
    {envoi ? <ActivityIndicator /> : <Button title={modeInscription ? 'Créer le compte' : 'Se connecter'} onPress={() => void soumettre()} />}
    <Button title={modeInscription ? 'Déjà un compte ? Se connecter' : 'Créer un compte'} onPress={() => setModeInscription(!modeInscription)} />
  </View>;
}
