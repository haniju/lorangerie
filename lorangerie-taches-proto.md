# Éditeur de tache — `lorangerie-taches-proto.html`

Outil d'atelier (standalone, hors build Vite) pour composer des **taches organiques colorées**
destinées à remplacer les groupes *AURA* du fichier `façade.svg` sur la home.

C'est l'évolution du **Produit C** du [PRD](PRD.md) : on a abandonné l'empilement de
`<radialGradient>` SVG au profit d'un **moteur Canvas 2D à dégradé freeform** (IDW), parce que :

- les AURA d'origine pèsent ~1 Mo (~4 650 formes pour seulement 33 couleurs distinctes) ;
- on veut **animer la couleur et le mouvement**, impossible à 60 fps sur des milliers de nœuds SVG ;
- on veut un bord qui **s'évapore** vers la transparence, que SVG ne sait pas faire nativement.

> Fichier unique, tout le JS inline, fonts via Google Fonts, **aucune dépendance**.
> Pour lancer : ouvrir `lorangerie-taches-proto.html` dans un navigateur.

---

## 1. Concept

Une **tache** est un champ de couleur défini par un ensemble de **points de couleur**.
Il n'y a pas de contour dessiné : la **silhouette émerge du champ des points** (façon *metaball*),
et le pourtour **s'évapore** jusqu'à l'opacité 0 (mode « C »).

Chaque point porte : une position, une couleur, une opacité **au centre** et **aux extrémités**,
un rayon d'influence, et un comportement de **dérive** (mouvement automatique) propre.

---

## 2. Moteur de rendu (IDW)

Calcul **par pixel** sur un buffer basse-résolution (voir [Performance](#6-performance)),
puis agrandissement vers le canvas affiché.

Pour chaque pixel, on parcourt les points et on accumule (`nd = distance / rayon`) :

1. **Poids de distance** : `w = 1 / (nd + 0.04)^IDW_EXP` (`IDW_EXP = 2`).
2. **Opacité du point à cette distance** : rampe linéaire **centre → extrémité** sur le rayon
   `ai = OP_C + (OP_E − OP_C) · min(nd, 1)`.
3. **Couleur** : moyenne IDW pondérée par `w·ai`
   → un point transparent ne teinte pas ses voisins, il ne fait que « tenir » l'espace.
4. **Opacité locale** : `aLocal = Σ(w·ai) / Σ(w)` (moyenne pondérée → un point transparent creuse un trou).
5. **Champ de présence** (silhouette) : noyau compact `Σ (1 − nd²)²` pour `nd < 1`,
   qui décroît jusqu'à 0 au loin.

La **silhouette + évaporation** est l'isocontour du champ de présence, adouci par un *smoothstep* :

```
e = smoothstep(Seuil, Seuil + Fondu, présence)
alpha_final = e · aLocal
```

Le canvas porte le **vrai canal alpha** (`d[o+3] = alpha·255`) → opacité 0 = **transparence réelle**,
la tache se composite sur n'importe quel fond (essentiel pour la home et l'export).

### Pixelisation & grain
- **Pixel** > 1 : le buffer IDW est calculé en basse résolution puis agrandi au **plus proche voisin**
  (blocs nets). Pixel = 1 : agrandissement lissé.
- **Grain** : superposition de bruit en `source-atop` → n'apparaît que sur les pixels déjà visibles
  (respecte la transparence du bord).

---

## 3. Interface

### Topbar (réglages globaux)

| Contrôle | Effet |
|---|---|
| **⏸ Pause / ▶ Lecture** | Fige/relance la dérive des points. Raccourci : **Espace**. |
| **⟲ Reset** | Réinitialise points et réglages aux valeurs par défaut. |
| **Pixel** (1–16) | Taille des blocs de pixelisation (1 = lisse). |
| **Grain** (0–0.6) | Intensité du grain superposé. |
| **Seuil** (0–1.2) | Taille des blobs : ↑ = silhouette plus resserrée. |
| **Fondu** (0.02–1.2) | Largeur de la zone d'évaporation du bord : ↑ = plus diffus. |
| **fps** | Compteur d'images/seconde (affiche `⏸ pause` à l'arrêt). |

### Panneau gauche — un point de couleur par carte

| Contrôle | Effet |
|---|---|
| **Pastille + hex** | Couleur. Champ hex éditable (synchronisé avec les curseurs TSL). |
| **T / S / L** | Teinte / Saturation / Luminosité (le curseur T est un dégradé arc-en-ciel). |
| **OP C** | Opacité **au centre** du point. |
| **OP E** | Opacité **aux extrémités** (au bord du rayon). |
| **RAY** | Rayon d'influence de l'aura (portée du point). |
| **AMP** (0–2.5×) | Amplitude de la dérive autour de la position de départ (0 = immobile). |
| **○ mobile / ◉ fixe** | Fige/libère individuellement la dérive du point. |
| **×** | Supprime le point (min. 1). |
| **+ Ajouter un point** | Ajoute un point (max. 16). |

Cliquer une carte **sélectionne** le point (bordure + barre teal) et le met en évidence sur le stage.

### Stage (zone d'édition, 70 %)

- **Glisser ◉** : déplace un point de couleur (définit sa position de départ `bx, by`).
- **Clic sur un point** : le sélectionne (halo pointillé sur le stage + carte surlignée).
- **Clic dans le vide** : désélectionne.
- **Suppr / Backspace** : supprime le point sélectionné.
- Un **petit carré noir** au centre d'un point indique qu'il est **fixe**.

---

## 4. Dérive (mouvement automatique)

Chaque point non-fixe oscille autour de sa position de départ :

```
x = bx + sin(clock·fx + phase) · ax · DRIFT_AMP · amp
y = by + cos(clock·fy + phase·1.3) · ay · DRIFT_AMP · amp
```

L'horloge `clock` est **accumulée** (`clock += dt·DRIFT_SPEED`) : pas de saut à la reprise après pause.
`amp` est le réglage **AMP** par point ; `fixed = true` coupe tout mouvement (point figé à `bx, by`).

---

## 5. Architecture du code

Un seul fichier, sections principales :

| Élément | Rôle |
|---|---|
| `hexToRgb` / `rgbToHsl` / `hslToRgb` / … | Conversions couleur hex ↔ rgb ↔ TSL. |
| `defaultPoints()` | Jeu de points par défaut (et structure d'un point). |
| `computeIDW(ctx, W, H)` | Cœur du rendu : champ IDW + présence + alpha, écrit dans une `ImageData`. |
| `render()` | Dimensionne le buffer, lance `computeIDW`, agrandit vers le canvas, applique le grain. |
| `renderHandles()` | Dessine les poignées (overlay SVG) ; redessiné à chaque frame. |
| `buildPanel()` | (Re)génère les cartes du panneau gauche. |
| `frame(ts)` | Boucle : met à jour la dérive, appelle `render` + `renderHandles`, calcule les fps. |
| `makeShape` / `shapePath` / `segMid` / `insertSeg` | Forme Bézier **conservée mais inactive** (voir flag ci-dessous). |

### Flag `SHAPE_CLIP`
- `false` (défaut) — **mode C** : silhouette émergente, bord évaporé, pas de contour.
- `true` — ancien mode : la tache est **découpée** par une forme Bézier éditable
  (ancres ■, poignées de courbure ●, insertion de points). Tout le code d'édition de forme
  reste présent et se réactive en basculant ce flag.

### Constantes utiles
`IDW_EXP` (netteté globale du dégradé), `BG_RGB` (couleur RGB de secours, anti-halo),
`MAX_PTS = 16`, `MIN_PTS = 1`, `DRIFT_SPEED`, `DRIFT_AMP`.

---

## 6. Performance

Le coût de l'IDW est ≈ `largeur_buffer × hauteur_buffer × nombre_de_points`.
Le buffer fait `taille_affichée / Pixel`, **plafonné à ~90 000 pixels** (`CAP`) pour garder le framerate :
- à **Pixel ≥ 3** (et le défaut 6) le buffer est petit → fluide même avec beaucoup de points ;
- à **Pixel 1–2** le plafond s'active : rendu un peu plus doux mais sans chute de fps.

---

## 7. Limites & pistes

- **Pas encore d'export.** Cible : PNG transparent (rastérisation du canvas) et/ou figeage en grille
  de cellules SVG. Étape suivante prévue : génération/édition des dégradés à partir de `façade.svg`,
  puis export du fichier affiché en home.
- **Dégradé de type « ligne »** (façon Illustrator, couleur diffusée le long d'une polyligne) :
  faisable en généralisant l'IDW (distance au segment + couleur paramétrique). Non implémenté.
- **Dissolution bruitée** du bord (seuil modulé par le grain, pour un effet « particules ») : envisagée.
- L'outil reste **standalone** ; décision à prendre sur une éventuelle migration dans le build Vite.
