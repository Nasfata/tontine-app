// Ce fichier démarre uniquement le serveur HTTP de l'application.
require('dotenv').config();
const app = require('./app');

// Le port peut être configuré dans l'environnement ou vaut 3000 par défaut.
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Serveur démarré sur http://localhost:${port}`));
