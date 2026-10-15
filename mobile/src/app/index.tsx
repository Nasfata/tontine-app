// useState = garde une valeur en mémoire (ici le message affiché à l'écran)
// useEffect = exécute du code quand l'écran s'affiche
import { useState, useEffect } from 'react';
// View = une "boîte" (comme une <div>), Text = pour afficher du texte,
// StyleSheet = pour créer les styles (couleurs, tailles, marges)
import { View, Text, StyleSheet } from 'react-native';
// On importe l'adresse de l'API.
// Ce fichier est dans src/app/, config.ts est dans src/ : on remonte d'un dossier avec "../"
import { API_URL } from '../config';

// Un écran = une fonction qui retourne de l'interface.
// "export default" : Expo Router sait que c'est l'écran de ce fichier.
export default function Accueil() {
  // "message" = la valeur actuelle, "setMessage" = la fonction pour la changer
  const [message, setMessage] = useState('Connexion au serveur...');

  // useEffect avec [] à la fin = s'exécute UNE seule fois, à l'affichage de l'écran
  useEffect(() => {
    // fetch = envoie une requête HTTP (comme Thunder Client, mais depuis l'app)
    fetch(`${API_URL}/`)
      // Transforme la réponse du serveur en objet JavaScript
      .then((reponse) => reponse.json())
      // Affiche le message reçu du serveur
      .then((donnees) => setMessage(donnees.message))
      // Si ça échoue (serveur éteint, mauvaise IP...), on affiche l'erreur
      .catch((erreur) => setMessage('Erreur : ' + erreur.message));
  }, []);

  return (
    // Boîte principale : prend tout l'écran
    <View style={styles.conteneur}>
      <Text style={styles.titre}>Tontine App</Text>
      {/* Affiche le message (se met à jour tout seul quand setMessage est appelé) */}
      <Text>{message}</Text>
      {/* Affiche l'adresse utilisée, pratique pour déboguer */}
      <Text style={styles.petit}>{API_URL}</Text>
    </View>
  );
}

// StyleSheet.create : définit les styles (comme du CSS, mais en JavaScript)
const styles = StyleSheet.create({
  conteneur: {
    flex: 1,                   // prend tout l'espace disponible
    justifyContent: 'center',  // centre verticalement
    alignItems: 'center',      // centre horizontalement
    backgroundColor: '#fff',   // fond blanc
  },
  titre: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  petit: { marginTop: 10, color: '#888', fontSize: 12 },
});