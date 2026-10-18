// React fournit la création du contexte et la gestion des états de session.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
// AsyncStorage garde la session sur le téléphone et dans le navigateur.
import AsyncStorage from '@react-native-async-storage/async-storage';
// appelerApi centralise les requêtes vers le backend.
import { appelerApi } from './api';

// Ces données publiques sont renvoyées par les routes d'authentification.
export type Utilisateur = { id: number; nom: string; telephone: string; photo: string | null };
// Ce type décrit les informations et actions accessibles dans le contexte.
type AuthContextValue = { utilisateur: Utilisateur | null; token: string | null; chargement: boolean; inscription: (nom: string, telephone: string, motDePasse: string) => Promise<void>; connexion: (telephone: string, motDePasse: string) => Promise<void>; deconnexion: () => Promise<void> };
// Les routes renvoient un jeton accompagné du profil de l'utilisateur.
type ReponseAuthentification = { token: string; utilisateur: Utilisateur };
// Le contexte est initialisé plus bas avec le fournisseur de session.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Le fournisseur restaure la session puis expose les actions d'authentification.
export function AuthProvider({ children }: { children: ReactNode }) {
  // Ces états représentent la session en mémoire et son chargement initial.
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  // La session sauvegardée est relue une fois au démarrage.
  useEffect(() => {
    // La lecture est asynchrone, le contexte reste en chargement jusqu'à sa fin.
    async function restaurerSession() {
      // Ce journal temporaire confirme que la restauration a bien commencé.
      console.log('[AuthContext] Début du chargement de session.');
      // Cette variable conserve l'utilisateur lu même avant le prochain rendu React.
      let utilisateurCharge: Utilisateur | null = null;
      try {
        // Les deux valeurs sont lues séparément pour rester simples à inspecter.
        const jetonSauvegarde = await AsyncStorage.getItem('token');
        const utilisateurSauvegarde = await AsyncStorage.getItem('utilisateur');
        // Une session n'est restaurée que si ses deux éléments sont présents.
        if (jetonSauvegarde && utilisateurSauvegarde) {
          // On convertit les données locales en objet utilisateur typé.
          utilisateurCharge = JSON.parse(utilisateurSauvegarde) as Utilisateur;
          // On restaure le jeton et le profil de la session sauvegardée.
          setToken(jetonSauvegarde);
          setUtilisateur(utilisateurCharge);
        }
      } catch (erreur) {
        // Une panne de stockage web est journalisée sans empêcher l'affichage de l'app.
        console.warn('[AuthContext] Lecture du stockage impossible :', erreur);
        // Une donnée locale illisible est supprimée en arrière-plan pour repartir proprement.
        void AsyncStorage.multiRemove(['token', 'utilisateur']).catch((erreurNettoyage) => console.warn('[AuthContext] Nettoyage du stockage impossible :', erreurNettoyage));
      } finally {
        // Ce journal temporaire indique la valeur d'utilisateur obtenue à la fin.
        console.log('[AuthContext] Fin du chargement de session.', { utilisateur: utilisateurCharge });
        // La navigation peut décider de la destination une fois le stockage lu.
        setChargement(false);
      }
    }
    // On lance la restauration dès que le fournisseur est monté.
    void restaurerSession();
  }, []);
  // Cette fonction sauvegarde et applique une session reçue du backend.
  async function enregistrerSession(session: ReponseAuthentification) {
    // Les deux éléments sont persistés ensemble avant de mettre à jour l'interface.
    await AsyncStorage.multiSet([['token', session.token], ['utilisateur', JSON.stringify(session.utilisateur)]]);
    // Les états React reflètent immédiatement la session persistée.
    setToken(session.token);
    setUtilisateur(session.utilisateur);
  }
  // L'inscription crée un compte et ouvre immédiatement la session retournée.
  async function inscription(nom: string, telephone: string, motDePasse: string) {
    // Les identifiants sont envoyés au point d'inscription du backend.
    const session = await appelerApi<ReponseAuthentification>('/api/auth/inscription', { method: 'POST', body: JSON.stringify({ nom, telephone, motDePasse }) });
    // On garde le jeton et le profil pour les prochains lancements.
    await enregistrerSession(session);
  }
  // La connexion vérifie les identifiants et mémorise la session renvoyée.
  async function connexion(telephone: string, motDePasse: string) {
    // Le backend renvoie le jeton et le profil si les identifiants sont valides.
    const session = await appelerApi<ReponseAuthentification>('/api/auth/connexion', { method: 'POST', body: JSON.stringify({ telephone, motDePasse }) });
    // On persiste la session pour éviter une nouvelle connexion au prochain lancement.
    await enregistrerSession(session);
  }
  // La déconnexion retire la session persistée et la session en mémoire.
  async function deconnexion() {
    // On supprime les deux valeurs enregistrées.
    await AsyncStorage.multiRemove(['token', 'utilisateur']);
    // L'application repasse à l'état non connecté.
    setToken(null);
    setUtilisateur(null);
  }
  // Le mémo évite de recréer la valeur du contexte si ses données n'ont pas changé.
  const valeur = useMemo(() => ({ utilisateur, token, chargement, inscription, connexion, deconnexion }), [utilisateur, token, chargement]);
  // Les écrans descendants peuvent maintenant lire et modifier la session.
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// Ce hook vérifie que le contexte est utilisé sous AuthProvider.
export function useAuth() {
  // On lit la valeur actuelle du contexte.
  const contexte = useContext(AuthContext);
  // Une utilisation hors fournisseur est une erreur de configuration explicite.
  if (!contexte) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  // On retourne les données et actions d'authentification.
  return contexte;
}
