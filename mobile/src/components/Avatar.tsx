// React Native fournit l'image et les formes circulaires.
import { Image, StyleSheet, Text, View } from 'react-native';
// Les couleurs et tailles viennent du thème partagé.
import { couleurs, rayons } from '../theme';
// L'adresse du serveur permet d'afficher les photos relatives.
import { API_URL } from '../config';

// Ces propriétés définissent une photo ou une initiale de remplacement.
type AvatarProps = { nom: string; photo?: string | null; taille?: number };

// Avatar affiche une photo valide ou la première lettre du nom.
export function Avatar({ nom, photo, taille = 52 }: AvatarProps) {
  // Les photos relatives reçoivent le préfixe de l'API.
  const uri = photo ? (photo.startsWith('http') ? photo : `${API_URL}${photo}`) : null;
  // Les dimensions suivent la taille demandée par l'écran.
  const styleAvatar = { width: taille, height: taille, borderRadius: taille / 2 };
  // Une image manquante est remplacée par une initiale contrastée.
  return uri ? <Image source={{ uri }} style={[styles.photo, styleAvatar]} /> : <View style={[styles.initiale, styleAvatar]}><Text style={{ color: couleurs.principal, fontSize: taille * 0.42, fontWeight: '700' }}>{nom.trim().charAt(0).toUpperCase() || '?'}</Text></View>;
}

// Ces règles donnent une couleur de remplacement cohérente.
const styles = StyleSheet.create({
  // La photo reste cadrée sans déformation.
  photo: { backgroundColor: couleurs.bleuClair },
  // Le cercle de secours centre l'initiale.
  initiale: { alignItems: 'center', justifyContent: 'center', backgroundColor: couleurs.fondChamp, borderRadius: rayons.pilule },
});
