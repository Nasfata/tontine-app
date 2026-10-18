// Expo Router fournit le reset de défilement pour les pages web plein écran.
import { ScrollViewStyleReset } from 'expo-router/html';
// React fournit le type des enfants insérés dans le document racine.
import type { PropsWithChildren } from 'react';

// Ce document HTML définit les dimensions globales du rendu web.
export default function DocumentWeb({ children }: PropsWithChildren) {
  // Les enfants incluent le point de montage Expo Router généré par Expo.
  return <html lang="fr"><head>
    {/* La page HTML occupe tout le viewport, même sans contenu initial. */}
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    {/* Le reset garde un comportement de défilement proche des écrans natifs. */}
    <ScrollViewStyleReset />
    {/* html, body et #root doivent transmettre une hauteur mesurable aux navigateurs. */}
    <style>{'html, body, #root { height: 100%; min-height: 100%; margin: 0; }'}</style>
  </head><body>{children}</body></html>;
}
