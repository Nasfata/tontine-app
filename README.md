# Tontine App

## Démarrage

### 1. Base de données
Exécuter `database/schema.sql` dans MySQL (Workbench ou terminal).

### 2. Backend
```bash
cd backend
npm install
# copier .env.example en .env puis remplir les valeurs
npm run dev
```

### 3. Application mobile / web
```bash
cd mobile
npm install
# modifier IP_DU_PC dans src/config.ts avec ton IP (commande ipconfig)
npx expo start
```