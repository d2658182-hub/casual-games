# CHAIN RUSH — Cahier des charges (SPEC)

Jeu web hypercasual pour Playgama. Vanilla JS, 100% assets téléchargés, responsive
sans bandes noires, 150–300 niveaux.

---

## 1. Concept (sacré, jamais modifié)

**Dessine des lignes continues pour relier des objets en mouvement permanent.**

- Des objets colorés (bonbons) bougent constamment à l'écran (flottent, rebondissent,
  tournent).
- Le joueur dessine une ligne fluide au doigt pour connecter un maximum d'objets de la
  **même couleur**.
- Une chaîne de **3+ objets de même couleur = explosion + points**.

---

## 2. Gameplay (boucle retenue : score cible + chrono)

- Chaque niveau a un **score cible** à atteindre et un **chrono**.
- Le joueur touche un bonbon → démarre une chaîne de cette couleur.
- Il glisse sur des bonbons de la MÊME couleur → la chaîne s'allonge (ligne fluide
  affichée sous le doigt).
- S'il touche un bonbon d'une **autre couleur** → la chaîne se casse (elle s'évanouit,
  aucun point).
- Au relâchement :
  - chaîne ≥ 3 → **explosion + points** (plus la chaîne est longue, plus le gain monte).
  - chaîne < 3 → rien (fizzle).
- **Victoire** : atteindre le score cible avant la fin du chrono → écran victoire,
  niveau suivant.
- **Défaite** : chrono à 0 sans avoir atteint la cible → écran game over.

### Scoring
- Points d'une chaîne de `n` : `50 * n * (n - 2)` → 3=150, 4=400, 5=750, 6=1200, 7=1750…
- **Combo** : chaque chaîne réussie dans les 3 s augmente un multiplicateur
  (×1 → ×1.5 → ×2 → ×2.5 → ×3 → … plafonné ×5). Une chaîne cassée remet le combo à ×1.
- Bonus de fin : secondes restantes × 20 ajoutées au score au moment de la victoire.

### Pénalités
- Chaîne cassée par une mauvaise couleur : −1 s de chrono (tension, pas frustrant).
- Fizzle (chaîne < 3) : rien, ou léger −1 s au-delà du niveau 10.

---

## 3. Thème & style

- **Candy sucré** : bonbons, sucettes, bonbons gélifiés colorés, fond pâtisserie.
- Palette : pastel chaleureux (rose, menthe, vanille, fraise, myrtille, citron, raisin).
- Cartoon, lisible, contraste fort pour distinguer les couleurs des bonbons.

---

## 4. Système de niveaux (150 → 300, courbe paramétrique)

Tout est produit par `levelConfig(level)` (config/courbe, pas de niveau codé à la main) :

| Paramètre | Formule | Niv 1 | Niv 50 | Niv 150 | Niv 300 |
|---|---|---|---|---|---|
| Score cible | `250 + 40 * level^1.15` | ~290 | ~3 850 | ~12 970 | ~28 470 |
| Chrono | `30 + min(30, (level-1) * 0.5)` s | 30 s | 55 s | 60 s | 60 s |
| Bonbons à l'écran | `min(22, 8 + round(level * 0.06))` | 8 | 11 | 17 | 22 |
| Couleurs | `min(7, 3 + floor(level / 45))` | 3 | 4 | 6 | 7 |
| Vitesse | `40 + level * 1.2` px/s | 41 | 100 | 220 | 400 |

### Bonbons spéciaux (apparaissent en cours de partie)
- **Doré** (niv ≥ 10) : compte ×3, apparaît rarement.
- **Bombe** (niv ≥ 25) : la connecter explose les bonbons voisins (+ points).
- **Arc-en-ciel / joker** (niv ≥ 40) : prolonge une chaîne quelle que soit sa couleur.

---

## 5. Écrans

- **Loading** : barre de progression (pack `bar_1`/`bar_2`), charge tous les assets.
- **Menu** : titre animé, PLAY, SHOP, bouton son.
- **Gameplay** : canvas plein écran + HUD (score / cible, chrono, combo, niveau, pause,
  boutons power-ups).
- **Pause** : RESUME, RESTART, QUIT.
- **Game Over** : score, meilleur score, RETRY, CONTINUE (rewarded → +15 s), MENU.
- **Victoire** : étoiles, pièces gagnées, NEXT LEVEL, DOUBLE COINS (rewarded).
- **Shop** : items avec **illustration visuelle** (image), prix en pièces, bouton BUY
  (+ option « WATCH AD » sur ≥50% des items).

---

## 6. Économie / méta

- **Pièces** gagnées à chaque partie : `round(score / 10) + 20 * niveau`.
- **Shop (consommables, illustrations obligatoires)** :
  1. **Extra Time** (+10 s) — icône sablier/horloge
  2. **Slow Motion** (bonbons 40 % plus lents, 8 s) — icône escargot/montre
  3. **Color Bomb** (élimine tous les bonbons d'une couleur) — icône bombe
  4. **Freeze** (gel des bonbons, 5 s) — icône glace/flocon
- Les power-ups sont **stockables** et activables en jeu via les boutons du HUD.
- Persistance : `localStorage` (clé du jeu) : pièces, stock de power-ups, niveau,
  meilleur score, settings son.

---

## 7. Pub (Playgama Bridge)

- **Interstitielle** : après 2 parties consécutives de même issue (2 victoires ou
  2 défaites), à la transition — jamais en plein jeu, max ~1 pour 2 parties.
- **Rewarded** :
  - Game over → **CONTINUE** : +15 s pour reprendre où on en était (1×/partie).
  - Victoire → **DOUBLE COINS**.
  - Shop → **WATCH AD** sur ≥50% des items (obtient l'item sans dépenser).
- Récompense accordée UNIQUEMENT si la pub est regardée jusqu'au bout (`rewarded`).
- Le jeu tourne AVEC et SANS le bridge. `game_ready`, `loadingProgress`, et les events
  pause/audio câblés une seule fois.

---

## 8. Assets (100% téléchargés, rien généré par code)

| Usage | Fichier | Source |
|---|---|---|
| Bonbons (7 couleurs + doré/bombe/arc-en-ciel) | `assets/game/candy-*.png` | pack itch.io / OpenGameArt |
| Fond menu | `assets/screens/menu-bg.png` | pack candy |
| Fond gameplay | `assets/screens/gameplay-bg.png` | pack candy |
| Illustrations shop (4) | `assets/game/item-*.png` | pack candy |
| Effets particules/explosion | `assets/game/fx-*.png` | pack candy |
| Musique (boucle) | `assets/audio/music.*` | fichier réel |
| SFX (collect, explosion, combo, victoire, défaite, clic) | `assets/audio/*.ogg` | fichiers réels |
| Pack UI (boutons/panneaux/pièces/étoiles/cœurs) | `assets/ui/*` | fourni (ne pas modifier) |

---

## 9. Responsive SANS bandes noires

- Canvas **plein viewport** (100% largeur/hauteur), redimensionné sur `resize` +
  `devicePixelRatio`.
- Objets positionnés en **coordonnées normalisées** (0..1) rapportées à la taille
  réelle du canvas → le terrain s'adapte à tout ratio (portrait/paysage).
- HUD en `flex` + `clamp`, jamais hors écran. Aucun letterbox, aucune bande noire.

---

## 10. Plan d'implémentation

1. `game-config.js` : titre, assets à charger, shop illustré, HUD.
2. `src/game/levels.js` : `levelConfig(level)` (courbe 150–300).
3. `src/game/candy.js` : entité bonbon (position, mouvement, couleur, type).
4. `src/game/chain.js` : logique de chaîne (début, extension, cassure, explosion).
5. `src/game/particles.js` : particules d'explosion (sprites).
6. `src/screens/gameplay-screen.js` : boucle canvas, input tactile/souris, HUD,
   power-ups, chrono, score, combo.
7. `src/screens/shop-screen.js` : items avec illustrations + BUY + WATCH AD.
8. `src/core/audio.js` : charger/vrai SFX + musique (remplacer les bips).
9. `src/core/sdk.js` : wrapper Playgama Bridge (game_ready, pub, pause/audio).
10. `index.html` : script bridge Playgama + nouveaux scripts.
11. `gameover`/`victory` : CONTINUE (rewarded), DOUBLE COINS (rewarded).

---

## 11. Critères de vérification (Phase 6)

- [ ] 150–300 niveaux jouables, progression réelle ressentie
- [ ] Hook compris en <3 s, 100% fidèle au concept
- [ ] Juice : explosion + particules + sons, combo visible, écrans de fin animés
- [ ] Musique bouclée + SFX + mute
- [ ] Shop avec illustrations (pas de texte seul)
- [ ] Pub interstitielle + rewarded testées (avec/sans bridge)
- [ ] Responsive tous écrans, zéro bande noire
- [ ] Zéro erreur console, zéro asset manquant
- [ ] Texte en anglais
- [ ] Repo + GitHub Pages jouable
