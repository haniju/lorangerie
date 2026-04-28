# PRD — L'Orangerie

Ce projet contient deux produits distincts qui cohabitent dans le meme repository.

---

## Produit A — Site vitrine "L'Orangerie"

### Vision
Site statique pour un client, deploye en production. Approche design system first : le DS est la fondation, les pages s'appuient dessus.

### Stack
- **Vite** (build, dev server, pas de framework JS)
- **SCSS** organise en `base/`, `components/`, `layout/`, `pages/`, `utilities/`
- **Utopia** pour le fluid sizing (tokens `--step-*` et `--space-*`)
- **GSAP + ScrollTrigger** pour les animations
- **Fonts** : Ortica Linear (headings), DM Sans variable (body)

### Pages
- Accueil (`index.html`)
- Contact (`contact.html`)
- Design System (`design-system.html`) — page partagee avec le Produit B

### Deploiement
- S3-compatible (IndieHosters, endpoint `hot-objects.liiib.re`)
- `npm run deploy` = build + sync via `s3cmd`

---

## Produit B — Outil de parametrage du Design System

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

## Perimetres

| Aspect | Produit A (site) | Produit B (outil DS) |
|---|---|---|
| Utilisateur cible | Visiteurs du site client | Designer/dev (moi) |
| Deploiement | Production (S3) | Dev local uniquement (Vite dev server) |
| Persistance | Statique (HTML/CSS/JS build) | JSON + SCSS via API Vite plugin |
| Page | `index.html`, `contact.html` | `design-system.html` |
