// AsyncStorage conserve le jeton entre les lancements de l'application.
import AsyncStorage from '@react-native-async-storage/async-storage';
// API_URL contient l'adresse du backend pour la plateforme courante.
import { API_URL } from './config';

// Les options correspondent aux options standard de fetch.
export async function appelerApi<T = unknown>(chemin: string, options: RequestInit = {}): Promise<T> {
  // On récupère le jeton sauvegardé pour authentifier les appels protégés.
  const token = await AsyncStorage.getItem('token');
  // On prépare les en-têtes en conservant ceux éventuellement fournis par l'appelant.
  const headers = new Headers(options.headers);
  // Toutes les requêtes de l'application envoient et reçoivent du JSON.
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  // Le jeton est ajouté seulement si une session est enregistrée.
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // On appelle le chemin demandé en le rattachant à l'adresse de l'API.
  const reponse = await fetch(`${API_URL}${chemin}`, { ...options, headers });
  // On tente de lire la réponse JSON, y compris pour les réponses d'erreur.
  const donnees = await reponse.json().catch(() => ({})) as Record<string, unknown>;
  // En cas d'échec, le message d'erreur du backend est transmis à l'appelant.
  if (!reponse.ok) throw new Error(typeof donnees.erreur === 'string' ? donnees.erreur : 'Une erreur est survenue.');
  // On renvoie les données avec le type choisi par l'appelant.
  return donnees as T;
}
