// Cette fonction retire les anciens service workers et caches de l'origine web.
export async function desinstallerServiceWorker(): Promise<void> {
  // Le rendu côté serveur ne possède pas l'objet navigator du navigateur.
  if (typeof navigator === 'undefined') return;
  // Les navigateurs sans service worker n'ont rien à désinscrire.
  if ('serviceWorker' in navigator) {
    // Une erreur de désinscription ne doit pas empêcher le nettoyage des caches.
    try {
      // On récupère toutes les inscriptions liées à cette origine.
      const inscriptions = await navigator.serviceWorker.getRegistrations();
      // On demande au navigateur de désinscrire chacune d'elles.
      await Promise.all(inscriptions.map((inscription) => inscription.unregister()));
    } catch (erreur) {
      // L'échec est visible dans la console sans bloquer le démarrage de l'app.
      console.warn('Impossible de désinscrire les service workers :', erreur);
    }
  }
  // Certains environnements n'exposent pas l'API Cache Storage.
  if (typeof caches !== 'undefined') {
    // Une erreur de cache ne doit pas bloquer l'utilisation de l'application.
    try {
      // On lit les noms de tous les caches de cette origine.
      const cles = await caches.keys();
      // On supprime chaque cache obsolète.
      await Promise.all(cles.map((cle) => caches.delete(cle)));
    } catch (erreur) {
      // L'échec est visible dans la console sans bloquer le démarrage de l'app.
      console.warn('Impossible de vider les caches web :', erreur);
    }
  }
}
