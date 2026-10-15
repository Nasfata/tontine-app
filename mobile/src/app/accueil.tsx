// Text et View construisent un écran simple, portable entre web et mobile.
import { Button, Text, View } from 'react-native';
// Le contexte donne accès au profil et à l'action de déconnexion.
import { useAuth } from '../AuthContext';

// Cet écran est la destination d'un utilisateur connecté.
export default function Accueil() {
  // On récupère l'utilisateur de la session et sa fonction de déconnexion.
  const { utilisateur, deconnexion } = useAuth();
  // L'écran affiche un accueil personnalisé et un bouton pour fermer la session.
  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Tontine App</Text>
    <Text>Bonjour {utilisateur?.nom}</Text>
    <Button title="Se déconnecter" onPress={() => void deconnexion()} />
  </View>;
}
