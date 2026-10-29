# DESIGN — RecuApp / InvoiceEase

Documentation d’implémentation établie à partir du dépôt (18 octobre 2026). Les composants sont React Native, partagés entre les cibles mobiles et web. Les couleurs métier de la boutique sont chargées depuis l’API et remplacent la couleur primaire par défaut.

## 1. Identité visuelle et palette

Interface claire, utilitaire et orientée gestion commerciale : fond gris bleuté très pâle, surfaces blanches, marque bleu marine, accent bleu moyen, états de paiement en vert et orange. Les en-têtes de boutique et les actions principales suivent `theme.couleur_primaire`.

| Rôle | Hexadécimal | Usage constaté |
|---|---|---|
| Principal par défaut | `#0B2C4D` | En-tête, actions, accent actif, identité de boutique |
| Secondaire par défaut | `#1E5F8C` | Couleur secondaire de thème |
| Accent / action secondaire | `#3478F6` | Actions modifier/partager, liens |
| Fond écran | `#F7F8FA` | Fond Dashboard et listes |
| Fond champ / panneau | `#F5F7FA` | Champs, surfaces de saisie, signature |
| Carte / surface | `#FFFFFF` | Cartes, modales, champs de recherche |
| Succès | `#1A9D54` | Encaissement et paiement, bénéfice positif |
| Fond succès | `#E6F7ED` | Badge payé |
| Erreur | `#E0473E` | Solde impayé, bénéfice négatif, suppression |
| Erreur formulaire | `#DC2626` | Marqueur et texte d’erreur |
| Fond erreur | `#FEF2F2` | Champ en erreur / bannière |
| Bordure standard | `#E8ECF0` | Champs, sélecteurs et cartes à contour |
| Séparateur | `#F0F1F3` | Séparateurs et bord des listes |
| Texte principal | `#1A1A1A` | Titres, valeurs et contenu |
| Texte secondaire | `#555555` | Libellés, boutons secondaires |
| Texte atténué | `#999999` | Aides, dates, placeholders et icônes neutres |
| Attente | `#D98B14` | Texte badge de paiement en attente |
| Fond attente | `#FFF3E0` | Badge à payer |

La palette est distribuée dans les composants, sans fichier de tokens global. Les styles utilisent aussi des blancs/noirs avec alpha (ex. `rgba(255,255,255,0.18)`); des couleurs de boutique autres que les valeurs par défaut peuvent provenir du compte utilisateur.

## 2. Typographie, rythme et effets

- Police : police système native (aucun `fontFamily` personnalisé ni chargement de police déclaré).
- Échelle observée : 10–11 px pour métadonnées et badges, 12–13 px pour aides et libellés, 14–15 px pour contenu/champs, 16–18 px pour valeurs et titres de carte, 26 px pour titres d’authentification. Les icônes Ionicons sont généralement de 16 à 22 px.
- Graisses utilisées : `600` pour textes secondaires/labels, `700` pour titres de ligne et actions, `800` pour en-têtes et totaux, `900` pour KPI.
- Espacements : base fréquente 4/6/8 px; 10 px entre cartes statistiques; 12–14 px pour padding interne; marges latérales de liste de 14 px; en-tête à 20 px.
- Rayons : 8 px badges compacts, 10–12 px champs et petits contrôles, 14 px recherche, 16 px cartes, 20 px chips, 24 px bas d’en-tête, bouton flottant circulaire de 58 px.
- Ombres cartes : noir, décalage `{width:0,height:2}`, opacité `0.05–0.08`, rayon 6, élévation 2–3. FAB : décalage vertical 6, opacité 0.3, rayon 12, élévation 8.

## 3. Composants réutilisables

### Boutons et actions

Les contrôles sont principalement `TouchableOpacity`. L’action primaire est pleine, texte blanc, fond primaire de la boutique, rayon 10–16 px et padding vertical 12–16 px. L’action flottante « nouveau reçu » fait 58×58 px, ronde, en bas à droite, avec icône `add` de 30 px et ombre. Les actions d’une carte de reçu sont des icônes dans une zone latérale; l’action déjà accomplie est remplacée par une coche grisée. Pression atténuée typiquement via `activeOpacity={0.7}`.

### Champs et validation

Champs à fond `#F5F7FA`, bordure `#E8ECF0` de 1 px, rayon 10–12 px, texte 15 px. Le focus n’a pas de style visuel dédié commun identifié. En erreur : bordure rouge `#DC2626`, fond `#FEF2F2`, message inline rouge 12 px et icône d’avertissement. Les formulaires affichent un astérisque rouge pour les champs requis. Pendant sauvegarde, le libellé du bouton est remplacé par un `ActivityIndicator` blanc.

### Cartes et badges

- KPI : cartes de hauteur variable, flex égale, padding 14, rayon 16 et légère ombre; valeur 16/900, libellé 11/600. Fonds primaire, succès, erreur ou blanc selon la métrique.
- Reçu : surface blanche, marge horizontale 14, marge haute 8, rayon 16, avatar 44×44, métadonnées 10–14 px, montant 14/800; panneau d’actions gris `#FAFBFC` séparé par `#F0F1F3`.
- Badge payé : fond `#E6F7ED`, texte `#1A9D54`; badge attente : fond `#FFF3E0`, texte `#D98B14`; rayon 8.
- Sélecteur de mois/statut : chips blanches, contour `#E8ECF0`, rayon 20, padding horizontal 14 et vertical 8. Le mois actif prend la couleur primaire et texte blanc; le badge de compte utilise un fond transparent clair.

### En-tête boutique

Fond primaire, padding supérieur 50 (inclut la zone système sur les écrans concernés), 20 horizontal, 18 bas; angles inférieurs 24. Logo 46×46, rayon 12; sans logo, initiale blanche sur fond blanc translucide. Nom 17/800, localisation 12. Bouton déconnexion 40×40 en blanc translucide. Le tap sur identité ouvre le profil; déconnexion demande confirmation.

### Barre d’onglets

Trois onglets : Factures, Clients, Produits. Fond blanc, hauteur configurée à 110, padding vertical 6/8, bordure supérieure `#F0F1F3`; icônes Ionicons 22 px; libellé 11/600. Actif = couleur primaire dynamique, inactif = `#9CA3AF`.

## 4. Navigation et écrans

```text
AppNavigator (stack conditionnel, en-têtes natifs masqués)
├─ chargement de session : écran plein primaire + indicateur blanc
├─ non connecté
│  ├─ Login
│  ├─ Register
│  ├─ ForgotPassword → Otp → ResetPassword
├─ connecté sans abonnement actif : SubscriptionStatus
└─ connecté et actif : MainTabNavigator
   ├─ FacturesTab (stack)
   │  ├─ Dashboard (racine)
   │  ├─ NouveauRecu
   │  ├─ RecuDetail
   │  └─ Profile
   ├─ ClientsTab (stack : ClientsListe → ClientForm)
   └─ ProduitsTab (ProduitsScreen)
```

Les stacks internes masquent leur en-tête natif. Le Dashboard porte l’en-tête boutique, la recherche, les KPI, le sélecteur mensuel et les filtres de statut, puis une liste de reçus groupée par mois avec en-têtes collants. Le FAB ouvre la création de reçu. Une modal permet d’enregistrer un règlement; le partage propose PDF ou image et affiche une surcouche de progression.

Clients et Produits sont des listes avec en-tête boutique, recherche, rechargement par glissement, modal locale d’ajout/édition et FAB. Ces écrans peuvent aussi passer en mode sélection depuis le flux de création du reçu et renvoyer l’élément choisi au stack Factures. Profile édite les informations de boutique, devise, couleurs et médias; les écrans Auth présentent les formulaires de connexion, création de compte et récupération de mot de passe. RecuDetail présente le détail et les actions du reçu. SubscriptionStatus informe de l’état d’abonnement.

## 5. Règles d’expérience utilisateur observées

- Retour immédiat visible : indicateur de chargement, succès/erreur via alertes, badge payé/en attente, compteur des filtres et animation d’opacité à la pression.
- Listes : pull-to-refresh; Dashboard et listes exposent une progression initiale; recherche vide et listes sans résultat disposent d’un état vide explicite.
- Erreurs : erreurs de champ inline; erreur serveur sous forme d’alerte (chargement) ou bandeau de formulaire; confirmations pour déconnexion et suppression.
- Paiement : préremplissage du solde dû, validation montant positif et inférieur ou égal au solde; mise à jour optimiste puis restauration locale en cas d’échec réseau.
- Partage : indicateur plein écran semi-transparent pendant la génération; le partage image attend le rendu de la carte cachée.
- Cibles tactiles : boutons d’en-tête 40×40, actions de reçu 32×32, FAB 58×58, chips avec padding. Plusieurs actions compactes sont inférieures à la recommandation mobile courante de 44–48 px : agrandir leur hit area est une amélioration possible, non un comportement actuellement garanti.

## 6. Code source réutilisable

Le dépôt ne contient aucun `theme.ts`. Le bloc `DEFAULT_THEME` ci-dessous est l’équivalent présent dans `src/context/AuthContext.js`. Les sources de composants suivantes sont reproduites intégralement, sans normalisation, pour conserver leurs comportements et styles réels.

### Thème par défaut — `src/context/AuthContext.js`

``jsx
const DEFAULT_THEME = {
  nom: 'Como Shop',
  logo_url: null,
  cachet_url: null,
  telephone: null,
  telephone_2: null,
  localisation: null,
  devise: 'FCFA',
  couleur_primaire: '#0B2C4D',
  couleur_secondaire: '#1E5F8C',
};
````

### En-tête boutique — `src/components/BoutiqueHeader.js`

``jsx
// src/components/BoutiqueHeader.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alert';

export default function BoutiqueHeader({ showBack = false, showLogout = true }) {
  const { theme, logout } = useAuth();
  const navigation = useNavigation();

  const s = styles(theme);

  const handleLogout = () => {
    showAlert(
      'DÃ©connexion',
      'Voulez-vous vraiment vous dÃ©connecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'DÃ©connexion', style: 'destructive', onPress: logout },
      ],
      'warning'
    );
  };

  const ouvrirProfile = () => {
    navigation.navigate('FacturesTab', { screen: 'Profile' });
  };

  return (
    <View style={s.header}>
      <TouchableOpacity
        style={s.headerLeft}
        onPress={ouvrirProfile}
        activeOpacity={0.7}
      >
        {theme.logo_url ? (
          <Image
            source={{ uri: theme.logo_url }}
            style={s.logo}
            resizeMode="contain"
          />
        ) : (
          <View style={s.logoPlaceholder}>
            <Text style={s.logoInitial}>
              {theme.nom?.[0] ?? 'R'}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={s.boutiqueName} numberOfLines={1}>
            {theme.nom}
          </Text>

          {theme.localisation ? (
            <Text style={s.boutiqueLoc} numberOfLines={1}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              {" "}{theme.localisation}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
 header: {
    backgroundColor: theme.couleur_primaire,
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  logo: {
    width: 46, height: 46, borderRadius: 12,
    marginRight: 12, backgroundColor: '#fff',
  },
  logoPlaceholder: {
    width: 46, height: 46, borderRadius: 12, marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoInitial: { fontSize: 20, fontWeight: '800', color: '#fff' },
  boutiqueName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  boutiqueLoc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
});
````

### Carte KPI — `src/components/dashboard/StatCard.js`

``jsx
// src/components/dashboard/StatCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Card de statistique rÃ©utilisable.
 *
 * Props :
 * - icon        : nom d'icÃ´ne Ionicons
 * - label       : libellÃ© sous la valeur (ex: "Chiffre d'affaires")
 * - valeur      : valeur affichÃ©e en gros (ex: "14 000 KMF")
 * - badge       : texte optionnel affichÃ© en haut Ã  droite (ex: "3 reÃ§us")
 * - fondCouleur : couleur de fond de la card (hex)
 * - textCouleur : couleur du texte valeur (dÃ©faut: '#fff')
 * - iconCouleur : couleur de l'icÃ´ne (dÃ©faut: rgba blanc)
 */
export default function StatCard({
  icon,
  label,
  valeur,
  badge,
  fondCouleur,
  textCouleur = '#fff',
  iconCouleur = 'rgba(255,255,255,0.8)',
}) {
  const labelColor = textCouleur === '#fff'
    ? 'rgba(255,255,255,0.7)'
    : '#999';

  return (
    <View style={[s.card, { backgroundColor: fondCouleur }]}>
      <View style={s.topRow}>
        <Ionicons name={icon} size={16} color={iconCouleur} />
        {badge ? (
          <Text style={[s.badge, { color: iconCouleur }]}>{badge}</Text>
        ) : null}
      </View>
      <Text
        style={[s.valeur, { color: textCouleur }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valeur}
      </Text>
      <Text style={[s.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
  },
  valeur: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
````

### Carte de reçu — `src/components/dashboard/RecuCard.js`

``jsx
// src/components/dashboard/RecuCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShareMenu from '../ShareMenu';


const calculerBenefice = (r) => {
  if (r.statut === 'annule' || r.cout_total == null) return null; // coÃ»t inconnu : rien Ã  afficher
  const cout  = Number(r.cout_total);
  const total = Number(r.montant_total ?? 0);
  const paye  = Number(r.avance_payee ?? 0);
  return {
    theorique: total - cout,             // peut Ãªtre nÃ©gatif (vente Ã  perte)
    realise:   Math.max(0, paye - cout), // jamais nÃ©gatif
  };
};

/**
 * Carte d'un reÃ§u avec colonne d'actions Ã  droite.
 *
 * Props :
 * - item            : objet reÃ§u
 * - theme           : objet thÃ¨me boutique (couleur_primaire, devise)
 * - onVoir          : () => void
 * - onModifier      : () => void
 * - onRegler        : () => void
 * - onPartager      : (type: 'pdf' | 'image') => void
 *                     appelÃ© aprÃ¨s le choix dans le menu de partage
 * - onSupprimer     : () => void
 */
export default function RecuCard({
  item,
  theme,
  onVoir,
  onModifier,
  onRegler,
  onPartager,
  onSupprimer,
}) {
  const [menuPartage, setMenuPartage] = useState(false);

  const formatMontant = (n) =>
    Math.round(Number(n ?? 0)).toLocaleString('fr-FR').replace(/,/g, ' ');

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const soldeRestant = Number(item.reste_a_payer ?? 0);
  const estPaye      = soldeRestant <= 0;
  const s            = styles(theme);
  const benefice = calculerBenefice(item);

  return (
    <View style={s.card}>
      {/* Zone principale cliquable â†’ voir dÃ©tail */}
      <TouchableOpacity style={s.main} activeOpacity={0.7} onPress={onVoir}>
        <View style={[s.avatar, { backgroundColor: theme.couleur_primaire + '15' }]}>
          <Text style={[s.avatarText, { color: theme.couleur_primaire }]}>
            {Array.from(item.client_nom ?? item.client?.nom ?? '?')[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={s.info}>
          <Text style={s.client} numberOfLines={1}>
            {item.client_nom ?? item.client?.nom ?? 'Client sans nom'}
          </Text>
          <Text style={s.numero} numberOfLines={1}>{item.numero}</Text>
          <Text style={s.date}>{formatDate(item.date_recu || item.created_at)}</Text>
        </View>
        <View style={s.right}>
          <Text style={[s.montant, { color: theme.couleur_primaire }]}>
            {formatMontant(item.montant_total)} {theme.devise}
          </Text>
          <View style={[s.badge, estPaye ? s.badgePaye : s.badgeAttente]}>
            <Text style={[s.badgeText, estPaye ? s.badgeTextPaye : s.badgeTextAttente]}>
              {estPaye ? 'PayÃ©' : `Reste Ã  payÃ© ${formatMontant(soldeRestant)}`}
            </Text>
          </View>
            {benefice && (
            <>
              <Text
                style={[
                  s.benefice,
                  { color: benefice.theorique < 0 ? '#E0473E' : '#1A9D54' },
                ]}
              >
                BÃ©nÃ©fice : {benefice.theorique > 0 ? '' : ''}{formatMontant(benefice.theorique)} {theme.devise}
              </Text>
              {!estPaye && (
                <Text style={s.beneficeRealise}>
                  BÃ©nÃ©fice encaissÃ© : {formatMontant(benefice.realise)} {theme.devise}
                </Text>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Colonne d'actions Ã  droite */}
      <View style={s.actions}>

        <TouchableOpacity style={s.actionBtn} onPress={onModifier}>
          <Ionicons name="create-outline" size={17} color="#3478F6" />
        </TouchableOpacity>

        {/* RÃ©gler : icÃ´ne cash si solde > 0, checkmark grisÃ© si dÃ©jÃ  payÃ© */}
        {!estPaye ? (
          <TouchableOpacity style={s.actionBtn} onPress={onRegler}>
            <Ionicons name="cash-outline" size={17} color="#1A9D54" />
          </TouchableOpacity>
        ) : (
          <View style={s.actionBtn}>
            <Ionicons name="checkmark-done-outline" size={17} color="#CCC" />
          </View>
        )}

        {/* Partager : ouvre le menu PDF / Image */}
        <TouchableOpacity style={s.actionBtn} onPress={() => setMenuPartage(true)}>
          <Ionicons name="share-social-outline" size={17} color="#3478F6" />
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={onSupprimer}>
          <Ionicons name="trash-outline" size={17} color="#E0473E" />
        </TouchableOpacity>
      </View>

      <ShareMenu
        visible={menuPartage}
        onClose={() => setMenuPartage(false)}
        onSelect={(type) => onPartager?.(type)}
      />
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  info: { flex: 1 },
  client: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  numero: { fontSize: 11, color: '#999', marginTop: 1 },
  date: { fontSize: 10, color: '#BBB', marginTop: 1 },
  right: { alignItems: 'flex-end', marginLeft: 8 },
  montant: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgePaye: { backgroundColor: '#E6F7ED' },
  badgeAttente: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextPaye: { color: '#1A9D54' },
  badgeTextAttente: { color: '#D98B14' },
  benefice: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  beneficeRealise: { fontSize: 10, color: '#999', marginTop: 1 },
  actions: {
    width: 46,
    backgroundColor: '#FAFBFC',
    borderLeftWidth: 1,
    borderLeftColor: '#F0F1F3',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
});
````

### Sélecteur de mois — `src/components/dashboard/MoisSelector.js`

``jsx
// src/components/dashboard/MoisSelector.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

/**
 * Barre horizontale scrollable de sÃ©lection de mois, style WhatsApp.
 *
 * Props :
 * - sections        : tableau [{ key: "2026-07", title: "Juillet 2026", data: [...] }]
 * - moisSelectionne : key du mois actif (null = tous)
 * - onSelect        : (key) => void â€” appelÃ© avec null pour "Tous"
 * - couleurPrimaire : couleur du bouton actif
 */
export default function MoisSelector({
  sections,
  moisSelectionne,
  onSelect,
  couleurPrimaire,
}) {
  if (!sections || sections.length === 0) return null;

  return (
    <View style={s.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* Bouton "Tous" */}
        <TouchableOpacity
          style={[
            s.btn,
            !moisSelectionne && s.btnActif,
            !moisSelectionne && { backgroundColor: couleurPrimaire },
          ]}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          <Text style={[s.btnText, !moisSelectionne && s.btnTextActif]}>
            Tous
          </Text>
        </TouchableOpacity>

        {/* Un bouton par mois */}
        {sections.map((section) => {
          const actif = moisSelectionne === section.key;
          return (
            <TouchableOpacity
              key={section.key}
              style={[
                s.btn,
                actif && s.btnActif,
                actif && { backgroundColor: couleurPrimaire },
              ]}
              onPress={() => onSelect(section.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.btnText, actif && s.btnTextActif]}>
                {section.title}
              </Text>
              <View style={[
                s.badge,
                { backgroundColor: actif ? 'rgba(255,255,255,0.3)' : couleurPrimaire + '20' },
              ]}>
                <Text style={[
                  s.badgeText,
                  { color: actif ? '#fff' : couleurPrimaire },
                ]}>
                  {section.data.length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { paddingBottom: 6 },
  scroll: { paddingHorizontal: 14, gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  btnActif: { borderColor: 'transparent' },
  btnText: { fontSize: 13, fontWeight: '700', color: '#555' },
  btnTextActif: { color: '#fff' },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
});
````

### Navigation principale — `src/navigation/MainTabNavigator.js`

``jsx
// src/navigation/MainTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

import DashboardScreen   from '../screens/app/DashboardScreen';
import NouveauRecuScreen from '../screens/app/NouveauRecuScreen';
import RecuDetailScreen  from '../screens/app/RecuDetailScreen';
import ClientsScreen     from '../screens/app/ClientsScreen';
import ClientFormScreen  from '../screens/app/ClientFormScreen';
import ProduitsScreen    from '../screens/app/ProduitsScreen';
import ProfileScreen     from '../screens/app/ProfileScreen';

const Tab = createBottomTabNavigator();
const FacturesStack = createNativeStackNavigator();
const ClientsStack   = createNativeStackNavigator();

/**
 * Stack imbriquÃ© pour l'onglet "Factures" â€” permet de naviguer vers
 * NouveauRecu et RecuDetail sans quitter l'onglet ni perdre la tab bar
 * visuellement (les Ã©crans poussÃ©s masquent la tab bar par dÃ©faut,
 * ce qui est le comportement standard attendu).
 */
function FacturesStackScreen() {
  return (
    <FacturesStack.Navigator screenOptions={{ headerShown: false }}>
      <FacturesStack.Screen name="Dashboard"   component={DashboardScreen} />
      <FacturesStack.Screen name="NouveauRecu" component={NouveauRecuScreen} />
      <FacturesStack.Screen name="RecuDetail"  component={RecuDetailScreen} />
      <FacturesStack.Screen name="Profile"     component={ProfileScreen} />
    </FacturesStack.Navigator>
  );
}

/**
 * Stack imbriquÃ© pour l'onglet "Clients" â€” liste + formulaire.
 */
function ClientsStackScreen() {
  return (
    <ClientsStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientsStack.Screen name="ClientsListe" component={ClientsScreen} />
      <ClientsStack.Screen name="ClientForm"   component={ClientFormScreen} />
    </ClientsStack.Navigator>
  );
}

export default function MainTabNavigator() {
  const { theme } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.couleur_primaire,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 110,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: '#F0F1F3',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            FacturesTab: focused ? 'document-text' : 'document-text-outline',
            ClientsTab:  focused ? 'people'         : 'people-outline',
            ProduitsTab: focused ? 'cube'            : 'cube-outline',
          };
          return <Ionicons name={icons[route.name]} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="FacturesTab"
        component={FacturesStackScreen}
        options={{ tabBarLabel: 'Factures' }}
      />
      <Tab.Screen
        name="ClientsTab"
        component={ClientsStackScreen}
        options={{ tabBarLabel: 'Clients' }}
      />
      <Tab.Screen
        name="ProduitsTab"
        component={ProduitsScreen}
        options={{ tabBarLabel: 'Produits' }}
      />
    </Tab.Navigator>
  );
}
````
