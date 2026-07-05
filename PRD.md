# PRD — L'Orangerie

Ce projet contient trois produits distincts qui cohabitent dans le meme repository.

---

## Produit A — Site vitrine "L'Orangerie"

### Vision
Site statique pour un client, deploye en production. Approche design system first : le DS est la fondation, les pages s'appuient dessus.

### Stack
- **Astro** (build statique `dist/`, tourne sur Vite -> plugins Vite conserves via `astro.config`)
- **SCSS** organise en `base/`, `components/`, `layout/`, `pages/`, `utilities/`
- **Utopia** pour le fluid sizing (tokens `--step-*` et `--space-*`), contenu plafonne a 1550px + marges fluides
- **Couleurs Figma-first** : `tokens.colors.json` -> `figma-to-colors.js` -> `colors.json` (genere) -> `_tokens.scss`
- **GSAP + ScrollTrigger** pour les animations
- **Fonts** : iCiel Cadena (logotype display), Ortica Linear (headings), DM Sans variable (body)

### Pages
- Home one-page (`index` — sections hero / coworking / fonctionnement / tarifs / pulpe / partenaires / footer)
- Pages annexes : contact, faq, mentions-legales, cgv, 404
- `design-system.html` = page du Produit B (**gele**, cf. ci-dessous)
- Reference structurelle detaillee (node-IDs) : voir `SITE-PLAN.md` ; execution : `PLAN-ACTION.md`

### Deploiement
- S3-compatible (IndieHosters, endpoint `hot-objects.liiib.re`)
- `npm run deploy` = build + sync via `s3cmd`

---

## Produit B — Outil de parametrage du Design System

> **Statut : GELE / non maintenu sur ce projet.** Ne pas l'utiliser. Depuis le passage aux couleurs **Figma-first**, `colors.json` est un fichier **genere** : le Produit B ne doit plus etre presente comme editeur live de `colors.json`. S'il est reactive un jour, il devra operer sur une source intouchee et **generer des versions**, jamais editer le fichier genere. La description ci-dessous est conservee pour memoire.

### Vision
Une page interactive (`design-system.html`) qui permet d'affiner les proprietes du design system directement dans l'environnement final (le navigateur). L'objectif est de pouvoir ajuster les tokens visuellement, voir le resultat en temps reel, et persister les modifications dans le code source.

Cet outil n'est pas destine au client — c'est un outil de travail pour le designer/developpeur.

### Architecture

#### Donnees
- Source de verite : `src/data/colors.json`
- Les teintes sont organisees en **groupes** (Fonds, Texte, Bordures, Brand...) et peuvent etre **sans groupe**
- Chaque teinte a : `id`, `name`, `variable` (CSS custom property), `hex`, `hsl`, `groupId`, `order`

#### Pipeline de persistance
1. L'UI modifie l'etat en memoire (`color-manager.js`)
2. A l'enregistrement, POST vers `/__api/colors` (Vite plugin)
3. Le plugin ecrit `colors.json`, regenere `_tokens.scss` (entre marqueurs `COLORS:START/END`), et propage les renommages de variables dans tous les fichiers SCSS
4. Vite HMR prend le relais pour le rechargement visuel

#### Modules JS (`src/js/colors/`)

| Module | Role |
|---|---|
| `color-manager.js` | Etat central, CRUD teintes/groupes, API fetch/save, pub/sub |
| `color-tabs.js` | Systeme d'onglets CHARTE / GENERAL |
| `color-charte.js` | Onglet CHARTE : swatches visuels, dropdown de configuration, drag & drop pour l'ordre des groupes |
| `color-general.js` | Onglet GENERAL : liste complete, multi-selection, creation/suppression de groupes, deplacement de teintes |
| `color-panel.js` | Panel d'edition HSL (bas de page), catalogue de teintes existantes, live preview |
| `color-popup.js` | Modale de confirmation / saisie |
| `color-utils.js` | Conversions HSL/HEX, generation de noms de variables, contrast detection |

#### Vite plugin (`vite-plugin-colors.js`)
Expose trois endpoints :
- `GET /__api/colors` — lecture du JSON
- `POST /__api/colors` — ecriture + regeneration tokens + propagation renommages
- `POST /__api/colors/check-usage` — verification d'usage d'une variable avant suppression
- `POST /__api/colors/replace-variable` — remplacement global d'une variable dans les SCSS

#### Script (`scripts/generate-tokens.js`)
Regenere la section `COLORS:START`...`COLORS:END` dans `_tokens.scss` a partir de `colors.json`.

### Onglets

#### CHARTE
Vue stylisee des couleurs selectionnees pour la charte graphique. Permet de :
- Choisir quels groupes/teintes apparaissent via un dropdown de configuration
- Reordonner les groupes par drag & drop
- Cliquer sur un swatch pour ouvrir le panel d'edition

#### GENERAL
Vue exhaustive de toutes les teintes. Permet de :
- Creer / renommer / supprimer des groupes
- Ajouter des teintes
- Multi-selectionner des teintes pour les grouper (avec gestion deplacer/dupliquer)
- Cliquer sur une teinte pour ouvrir le panel d'edition

### Panel d'edition (color-panel)

Le panel s'ouvre en bas de page et contient :

**Partie gauche — Edition**
- Label du groupe de la teinte en cours d'edition
- 3 sliders HSL (Teinte / Saturation / Luminosite) avec gradients dynamiques
- Affichage hex en temps reel
- Champ de saisie pour le nom
- Boutons : Annuler / Enregistrer / Supprimer (si edition)

**Partie droite — Catalogue**
- Liste de toutes les teintes existantes, classees par groupe
- Cliquer sur une teinte du catalogue charge ses valeurs HSL dans les sliders comme point de depart

#### Regles d'interaction du panel

1. **Cible d'edition stable** : quand le panel est ouvert pour une teinte X, `editingTintId` reste X pendant toute la session du panel, quels que soient les clics dans le catalogue. Selectionner une teinte A dans le catalogue charge uniquement ses valeurs HSL dans les sliders — c'est un raccourci pour partir d'une couleur existante. Le nom reste celui de X. L'enregistrement modifie X, jamais A.

2. **Highlight de la cible** : quand le panel est ouvert pour une teinte X, le contour de la boite de X (swatch dans CHARTE, tint-swatch dans GENERAL) est legerement renforce (classe `.is-editing`, border passe a `--color-text-secondary`) pour indiquer visuellement quelle teinte est en cours d'edition.

3. **Live preview** : les modifications des sliders sont immediatement refletees sur la CSS custom property de la teinte en cours d'edition et sur les swatches visibles.

4. **Annulation** : restaure les valeurs HSL originales de la teinte et ferme le panel.

5. **Suppression** : verifie l'usage de la variable dans les SCSS avant de supprimer. Propose une confirmation si la variable est utilisee.

---

## Produit C — Outil de mapping SVG (formes & degrades)

### Vision
Un outil interactif pour **composer des formes vectorielles libres et des degrades complexes sur mesure**, puis les **exporter en SVG avec les effets choisis** (modes de fusion par point, mosaique de cellules, clip a la forme). L'objectif est de produire des assets graphiques riches — impossibles a obtenir avec un degrade CSS classique — tout en restant vectoriels et editables (Illustrator-ready).

Comme le Produit B, ce n'est pas un livrable client : c'est un outil de travail pour le designer/developpeur, qui sert a mettre au point la technique et les controles avant une eventuelle integration.

### Statut
**Prototype / exploration.** Vit dans des fichiers HTML autonomes a la racine du repo (`lorangerie-gradient-demo.html`, `orangerie-gradient-canvas.html`, et autres `*-demo.html`), **hors du build Vite**. Aucune dependance au reste du site : fonts via Google Fonts, tout le JS inline. Format de travail fixe en portrait 180×240 (ratio telephone).

### Ce qui est explore — 3 techniques de rendu comparees

Le proto `lorangerie-gradient-demo.html` met cote a cote trois approches du **meme** degrade freeform, pour arbitrer entre qualite, scalabilite et exportabilite :

| # | Technique | Principe | Force |
|---|---|---|---|
| 01 | **SVG natif** | Couches `<radialGradient>` empilees, chacune dans un `<g>` avec son propre `mix-blend-mode` CSS (12 modes). Forme = `<clipPath>` Catmull-Rom ferme. | Vectoriel, scalable a l'infini |
| 02 | **WebGL** | Memes points rendus en shader GLSL (accumulation `alpha / pow(distance, exposant)`), blend mode par point code en GLSL (8 modes). Forme appliquee en `clip-path: path()` CSS. | Rendu GPU temps reel, fidele |
| 03 | **Pixel Grid** | Mosaique de carres alignes sur grille, chaque cellule coloree par **IDW** (inverse distance weighting) sur les points du panneau source. | **Exportable en SVG** propre (rects + clipPath) |

### Modele d'interaction (le coeur du proto)

Une classe `Panel` reutilisee pour les panneaux SVG et WebGL. Sur chaque panneau, un overlay SVG expose **trois types de poignees** :
- **carres blancs** — points de la forme (deplacables) ;
- **ronds colores** — points du degrade (deplacables) ;
- **petits ronds « + »** — milieux de segments, pour inserer un point de forme.

Un **clic dans le vide** ajoute un point de forme sur le segment le plus proche. Le panneau de controle (genere dynamiquement) permet de regler : tension de la courbe, liste des points de forme, et par point de degrade — couleur, rayon, opacite et **mode de fusion**.

### Export
La Pixel Grid genere un SVG telechargeable (rectangles colores + `clipPath` optionnel pour la forme), pret a ouvrir dans Illustrator. Reglages : taille de cellule, espacement, exposant IDW, rayon des coins, application ou non de la forme du panneau source.

### Pistes / a faire
- Trancher la ou les technique(s) a retenir selon l'usage (decor de page vs asset exportable).
- Nettoyer l'heritage de nommage (`locsos-*`, titre « Freeform Gradient ») vers la nomenclature Orangerie.
- Decider si l'outil migre dans le build Vite (comme le Produit B) ou reste un atelier standalone.

---

## Perimetres

| Aspect | Produit A (site) | Produit B (outil DS) | Produit C (mapping SVG) |
|---|---|---|---|
| Utilisateur cible | Visiteurs du site client | Designer/dev (moi) | Designer/dev (moi) |
| Deploiement | Production (S3) | Gele — non maintenu sur ce projet | Aucun — proto standalone |
| Persistance | Statique (HTML/CSS/JS build) | JSON + SCSS via API Vite plugin | Export SVG telecharge |
| Page | `index.html`, `contact.html` | `design-system.html` | `*-demo.html` (racine, hors build) |
