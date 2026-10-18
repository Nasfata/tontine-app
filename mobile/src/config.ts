// Platform permet de savoir si le code tourne sur "web", "android" ou "ios"
import { Platform } from 'react-native';

// ⚠️ REMPLACE par l'IP de TON PC (trouvée avec la commande ipconfig)
const IP_DU_PC = '192.168.1.22';

// Le port de ton backend (celui du fichier .env du backend)
const PORT = 3000;

// Sur le web, "localhost" fonctionne (le navigateur est sur le même PC que le serveur).
// Sur mobile, "localhost" désignerait le téléphone lui-même : il faut l'IP du PC.
export const API_URL =
  Platform.OS === 'web'
    ? `http://localhost:${PORT}`
    : `http://${IP_DU_PC}:${PORT}`;