// React Native fournit le conteneur multiplateforme de la carte.
import { StyleSheet, View, type ViewProps } from 'react-native';
// Les constantes partagées donnent le même aspect à toutes les cartes.
import { couleurs, espacements, ombres, rayons } from '../theme';

// Ces propriétés permettent d'ajouter du contenu et un style ponctuel.
type CarteProps = ViewProps & { children: React.ReactNode };

// Carte applique le fond blanc, l'arrondi et l'ombre discrète.
export function Carte({ children, style, ...props }: CarteProps) {
  // Le style fourni est ajouté après les règles de base.
  return <View {...props} style={[styles.carte, style]}>{children}</View>;
}

// Ces règles définissent une surface généreuse et régulière.
const styles = StyleSheet.create({
  // La carte contraste avec le fond chaud de l'application.
  carte: { padding: espacements.moyen, borderRadius: rayons.moyen, backgroundColor: couleurs.carte, ...ombres.carte },
});
