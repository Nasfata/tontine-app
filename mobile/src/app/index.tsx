// Redirect envoie l'utilisateur vers la route adaptée à sa session.
import { Redirect } from 'expo-router';
// useAuth lit l'utilisateur restauré par le fournisseur global.
import { useAuth } from '../AuthContext';

// Cette route d'entrée redirige vers l'accueil ou la connexion.
export default function Index() {
  // On lit l'état de session chargé par AuthProvider.
  const { utilisateur } = useAuth();
  // Les utilisateurs connectés vont à l'accueil.
  if (utilisateur) return <Redirect href="/accueil" />;
  // Les autres utilisateurs vont à l'écran de connexion.
  return <Redirect href="/connexion" />;
}
