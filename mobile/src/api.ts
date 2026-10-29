// AsyncStorage conserve le jeton entre les lancements de l'application.
import AsyncStorage from '@react-native-async-storage/async-storage';
// API_URL contient l'adresse du backend pour la plateforme courante.
import { API_URL } from './config';

// Cette erreur conserve le code HTTP pour les écrans qui gèrent un cas précis.
export class ErreurApi extends Error {
  // Le statut permet notamment de reconnaître une route encore absente.
  constructor(message: string, public readonly statut: number, public readonly invitation = false) {
    // Le message backend reste le message affiché à l'utilisateur.
    super(message);
    // Le nom distingue cette erreur d'une erreur réseau standard.
    this.name = 'ErreurApi';
  }
}

// Les options correspondent aux options standard de fetch.
export async function appelerApi<T = unknown>(chemin: string, options: RequestInit = {}): Promise<T> {
  // On récupère le jeton sauvegardé pour authentifier les appels protégés.
  const token = await AsyncStorage.getItem('token');
  // On prépare les en-têtes en conservant ceux éventuellement fournis par l'appelant.
  const headers = new Headers(options.headers);
  // Le navigateur ou React Native choisit la frontière multipart pour FormData.
  const corpsMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
  // Les autres appels envoient du JSON et les téléversements gardent leur type multipart.
  if (!corpsMultipart) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  // Le jeton est ajouté seulement si une session est enregistrée.
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // On appelle le chemin demandé en le rattachant à l'adresse de l'API.
  const reponse = await fetch(`${API_URL}${chemin}`, { ...options, headers });
  // On tente de lire la réponse JSON, y compris pour les réponses d'erreur.
  const donnees = await reponse.json().catch(() => ({})) as Record<string, unknown>;
  // En cas d'échec, le message d'erreur du backend est transmis à l'appelant.
  if (!reponse.ok) throw new ErreurApi(typeof donnees.erreur === 'string' ? donnees.erreur : 'Une erreur est survenue.', reponse.status, donnees.invitation === true);
  // On renvoie les données avec le type choisi par l'appelant.
  return donnees as T;
}
