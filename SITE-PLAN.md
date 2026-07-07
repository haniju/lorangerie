# Plan du site — L'Orangerie (Produit A)

> Référentiel structurel dérivé de la maquette Figma. Sert à **s'accorder sur le naming et les IDs** avant l'implémentation. Chaque bloc est tracé vers son node Figma.

> **SITE-PLAN = référence structurelle** (ce document). **[PLAN-ACTION.md](PLAN-ACTION.md) = exécution** (phases, todo, décisions verrouillées, pipelines). Les deux se lisent ensemble.

## Source Figma

- **Fichier** : `7DzYNhjUAgmGA8gSEnN74k` (lorangerie)
- **Desktop** : frame `home - desktop` — node `36:2815` (largeur 1280)
- **Mobile** : frame `home - mobile` — node `38:3195` (largeur 440)
- Site **one-page** : une seule page (`index.html`), navigation par scroll + dot-nav latérale.
- Bibliothèque de composants sous `assets/website/` en **atomic design** : `atome/`, `composant/`, `bouton/`, `nav/`.

---

## Home — Arborescence des sections (ordre de scroll)

| # | Slug / `id` | Rôle | Section desktop | Marqueur index desktop | Section mobile | Index mobile |
|---|---|---|---|---|---|---|
| — | `hero` | Logo, accroche (`sous-titre`), illustration bâtiment, proposition | 32:2503 | — | 219:1931 | — |
| 1 | `coworking` | Offre coworking (`bento`) + bouton | 32:2613 | 211:3165 | 219:1930 | 219:1737 |
| 2 | `fonctionnement` | Liste des principes + proposition + boutons | 168:2266 | 168:2419 | 219:1845 | 219:1738 |
| 3 | `tarifs` | Intro + tableau tarifs + bloc « suis-je concerné » + boutons | 44:4606 | 168:2424 | 63:4877 | 219:1739 |
| 4 | `pulpe` | Présentation PULPE : historique, « aujourd'hui », photo de groupe | 44:4604 | 513:8772 | 319:5915 | 219:1740 |
| 5 | `partenaires` | Logos partenaires + bouton | 44:4605 | 176:2457 | 319:5922 | 219:1776 |
| — | `footer` | Pied de page | 44:4580 | — | 44:4588 | — |

Slugs validés : `hero`, `coworking`, `fonctionnement`, `tarifs`, `pulpe`, `partenaires`.

### Notes de structure (maquette → code)

- **Marqueurs d'index placés HORS de l'autolayout des sections (desktop)** = pur confort de maquettage. **En code, aucune distinction** : l'étiquette d'index appartient à sa section (elle est le point d'ancrage du scrollspy).
- **Étiquette d'index de `pulpe`** : elle porte le **logo Pulpe** (node `181:3025` en mobile ; en desktop l'instance `513:8772` est **volontairement détachée** pour l'y intégrer — le texte « Nos tarifs » qui y traîne est un label résiduel, à ignorer/nettoyer).

---

## Navigation

| Composant Figma | Nom code | Desktop | Mobile | Rôle |
|---|---|---|---|---|
| `nav/NAVBAR` | `.navbar` | 32:2502 (h.50) | 44:3492 (h.62) | Barre du haut |
| `nav/index_panneau` | `.index-nav` | 559:39023 | 181:2938 | Dot-nav latérale (scrollspy) |
| `nav/index_boutons` | `.index-nav__item` | 559:39024→39028 (×5) | 219:1737… | Puce / ancre de section |
| `nav/footer` | `.footer` | 44:4580 | 44:4588 | Pied de page |

- **Desktop** : dot-nav fixe à gauche, 5 puces → scrollspy vers les 5 sections nav (hero et footer exclus).
- Le lien `bouton/lien-cliquable` sert dans le **footer**.

---

## Inventaire des composants (atomic design)

> Convention code : classes calquées sur les noms Figma, sans le préfixe de collection. Les collisions section↔composant (`fonctionnement`, `tarifs`, `partenaires`) sont levées par la distinction **`id` de section** (`#fonctionnement`) vs **classe de composant** (`.principes`).

### `atome/`

| Figma | Nom code | Rôle |
|---|---|---|
| `atome/forfait` | `.forfait` | Carte forfait unitaire (compose `tableau-tarifs`) |
| `atome/proposition` | *(voir ci-dessous)* | Picto + texte, variantes typo & position picto |

### `composant/`

| Figma | Nom code | Node(s) instances | Rôle |
|---|---|---|---|
| `composant/bento` | `.bento` | 38:3293 / 44:3547 | Grille bento de l'offre coworking |
| `composant/fonctionnement` | `.principes` | 299:5460 / 319:5716 | Liste des principes (réunion, parking, casier…) |
| `composant/proposition` | `.proposition` | D: 671:18244, 576:13500, 430:9889, 482:8591 · M: 815:17485, 815:17606, 820:23336, 841:11385 | Bloc accroche récurrent |
| `composant/tableau-tarifs` | `.tableau-tarifs` | 44:4311 / 44:4346 | Tableau des tarifs (assemble des `forfait`) |
| `composant/partenaires` | `.logos-partenaires` | 44:4496 / 44:4527 | Bloc logos partenaires |
| `composant/bloc-simple` | `.bloc-simple` | 815:17426 / 815:17429 *(instances « sous-titre »)* | Bloc texte simple (accroche hero) |
| `composant/display` | *(texte pur)* | — | Logotype « L'ORANGERIE » sur bloc coloré → **texte pur** (police iCiel Cadena), pas d'asset SVG |

**`proposition` : atome + composant = UN seul composant code.**
La scission Figma (atome = picto+texte ; composant = couche background) évite l'explosion combinatoire (9 + 4 variantes vs 36). En code, ça se réduit à un composant `.proposition` avec **3 axes de modifieurs** :
- emphase : `--regular` / `--bold-italic` / `--light`
- position picto : `--picto-left` / `--picto-top` / `--picto-right`
- surface : `--plain` / `--gradient` / `--card`

### `bouton/`

| Figma | Nom code | Note |
|---|---|---|
| `bouton/primary` | `.btn--primary` | |
| `bouton/secondary` | `.btn--secondary` | |
| `bouton/fab` | `.btn--fab` | Rond « + » (floating action) |
| `bouton/nav-primary` | `.btn--nav-primary` | |
| `bouton/nav-secondary` | `.btn--nav-secondary` | |
| `bouton/lien-cliquable` | *(lien footer)* | Utilisé dans le footer |
| ~~`bouton/charte`~~ | — | **À ignorer** |
| ~~`bouton/primary_back`~~ | — | **Composant mort → ignorer** (usages réalignés sur `primary`) |

### `assets/`

| Figma | Nom code | Node(s) | Rôle |
|---|---|---|---|
| `assets/logo/lorangerie` | `logo-lorangerie` | 482:8542 / 559:43467 | Logo illustré (hero) |
| `assets/illustration/batiment` | `illustration-batiment` | 131:1109 / 559:39065 | Illustration du bâtiment (hero) |
| `assets/fond` | `bg-page` | 327:7262 (mobile) | Fond de page |
| décorations : `kiwi`, `tasse`, `laptop`, `plante`, `framboise`, `orange` | `deco-*` | 539:* / 688:* | Doodles décoratifs (souvent masqués desktop, visibles mobile) |

---

## Conventions de nommage

- **Sections** : `<section id="coworking" class="section section--coworking">`. `id` kebab-case = ancre dot-nav (`href="#coworking"`).
- **Composants** : classe calquée sur le nom Figma sans préfixe de collection ; collisions section↔composant levées par `id` vs `class`.
- **Assets** : préfixe par type (`logo-`, `illustration-`, `deco-`, `bg-`).
- **SCSS** : un partial par section dans `pages/`, un partial par composant dans `components/`.

---

## Contenu texte — source dans les variables Figma

Le texte vit dans des **variables *string*** Figma (récupérables via `get_variable_defs`) : `coworking_/bento/coordinatrice`, `fonctionement_/liste_/{reunion,reunion_2,parking,casier,impression,the,cuisine}`, `partenaire_/label1|2`, etc. → source pour le pipeline contenu.

### Écriture inclusive — modalités incohérentes à unifier

| Occurrence brute | Node / variable | Modalité |
|---|---|---|
| `adhérent·e·s` | `fonctionement_/liste_/reunion` | **point médian `·`** |
| `habitant.e.s` | 32:2801 / 44:4461 | point `.` |
| `entrepreneur.e.s` | 32:2801 / 44:4461 | point `.` |
| `usagers.ères` | (prose pulpe) | point `.` |

→ Le contenu mélange **point médian**, **point** et **tiret** (3 modalités) : matière du skill `inclusive-writing`. **Spec de référence : [INCLUSIVE-WRITING.md](INCLUSIVE-WRITING.md)** (détection → liste avant/après → unification point médian `·` U+00B7 + forme aria/`sr-only`).

---

## Pages annexes (non maquettées — à construire depuis le DS, après la home)

Multi-page statique (ajoutées au build Vite `rollupOptions.input`, comme l'actuel `contact.html`). Elles héritent navbar + footer + tokens.

| Page | Fichier | Contenu / layout |
|---|---|---|
| Contact | `contact.html` | Formulaire (nom, email, objet, message) + coordonnées |
| FAQ | `faq.html` | Accordéon de questions/réponses |
| Mentions légales | `mentions-legales.html` | Texte long, primitives typo du DS |
| CGV | `cgv.html` | Texte long, primitives typo du DS |
| 404 | `404.html` | Page d'erreur + retour accueil ; document d'erreur S3 |

---

## Reste à faire

- **Tokens** : pipelines décrits dans [PLAN-ACTION.md](PLAN-ACTION.md) et [README-tokens-couleur.md](README-tokens-couleur.md). Couleurs **Figma-first** (`tokens.colors.json` → `figma-to-colors.js` → `colors.json` généré) ; twin fluide `generate-fluid.js` à créer (`--space-*` / `--step-*` Utopia) ; police **iCiel Cadena** à déclarer en `@font-face` (logotype `display`).
- Re-scan de verrouillage final si de nouveaux renommages Figma interviennent.
