# CLAUDE.md

## Projet

Site statique vitrine "L'Orangerie". Approche design system first — le DS est la fondation, les pages s'appuient dessus.

## Stack & conventions

- **Astro** pour le build (site statique → `dist/`) — tourne sur Vite, donc les plugins Vite restent branchés via `astro.config` → `vite.plugins`. Composants `.astro`, routing par fichiers (`src/pages/`), layouts partagés (navbar + footer uniques).
- **SCSS** organisé en `base/`, `components/`, `layout/`, `pages/`, `utilities/`
- **Utopia** pour le fluid sizing — ne jamais hardcoder des tailles de typo ou d'espacement en px/rem fixes. Utiliser les tokens `--step-*` et `--space-*`. Contenu plafonné à 1550px + marges fluides (bornes 440 / 1280).
- **Couleurs Figma-first** : Figma = seule source → `src/data/tokens.colors.json` (arbre profond) → `scripts/figma-to-colors.js` → `src/data/colors.json` (**généré, ne pas éditer**) → `scripts/generate-tokens.js` → `_tokens.scss`. Primitives `_base` en valeur (`--sapin-80: #213D2C`), tokens sémantiques en référence (`--action-button-primary-initial: var(--sapin-80)`). Voir `README-tokens-couleur.md`.
- **GSAP + ScrollTrigger** pour les animations. Attributs data : `data-fade-in`, `data-parallax="0.2"`. `prefers-reduced-motion` respecté partout.
- **Contenu texte** : source Figma → `src/data/textes.json` (transform `scripts/figma-to-content.js`, à créer), consommé par les composants — jamais en dur dans le HTML.
- **Fonts** (dans `src/assets/font/`) : **iCiel Cadena** (logotype `display`, fichier `iciel-cadena.ttf`), **Ortica Linear** (headings), **DM Sans** variable (body).

## Design

- Direction : léché, discret mais solide. Niveau design engineer
- Palette : primitives `_base` (familles `sable`, `citron`, `peche`, `sapin`, `citrouille`) + tokens sémantiques `tokens` (familles `action`, `text`, `light`, `background`). Définie **Figma-first**, générée dans `_tokens.scss` (ne jamais y écrire de hex en dur)
- 2 fonts, 3 niveaux de titres (h1/h2/h3), 2 blocs texte (body/highlight), 3 boutons (filled/outlined/link)
- Logotype `display` (« L'ORANGERIE ») = **texte pur** en iCiel Cadena, PAS d'asset SVG
- Responsive **fluide** (Utopia, `clamp()`) entre 440px (mobile) et 1280px (desktop) ; contenu plafonné à 1550px, marges fluides absorbant l'espace au-delà. Pas de cascade de breakpoints fixes. *(NB : des `@media (max-width: 40rem)` subsistent dans du SCSS legacy/Produit B — à réconcilier lors du passage Astro.)*

## Déploiement

- S3-compatible (IndieHosters, endpoint `hot-objects.liiib.re`)
- Outil : `s3cmd` (pas aws-cli)
- `npm run deploy` = build + sync
- Certificat SSL de l'endpoint renouvelé (Let's Encrypt, valide jusqu'au 20/09/2026) — `--no-check-certificate` retiré du script deploy

## Commandes

```
npm run dev            # Dev server (Astro)
npm run build          # Build statique → dist/
npm run deploy         # Build + deploy S3
npm run tokens:colors  # Régénère colors.json + _tokens.scss depuis tokens.colors.json
```

## Système de grille — largeurs des éléments

Les largeurs de blocs sont toujours exprimées via les tokens grille définis dans `src/scss/base/_fluid.scss` :

```
--grid-col-desktop-1 … --grid-col-desktop-7   (grille 7 colonnes)
--grid-col-mobile-1  … --grid-col-mobile-5    (grille 5 colonnes)
```

Ces tokens sont calculés depuis `--grid-useful` (largeur utile de la page = 100vw - marges, plafonné à 1550px).

**Règle** : ne jamais hardcoder une largeur en px/rem sur un bloc de mise en page. Toujours utiliser `width: var(--grid-col-desktop-X)` en desktop et `width: var(--grid-col-mobile-X)` en mobile.

**Workflow pour chaque nouvelle section** : avant de coder, demander (ou vérifier dans Figma) :

1. **Largeur de chaque bloc** — combien de colonnes en desktop ? en mobile ? (→ `--grid-col-desktop-X` / `--grid-col-mobile-X`)
2. **Indent de la colonne** — à quelle distance du bord gauche de la section la colonne démarre-t-elle ? (ex. `padding-left: var(--grid-col-desktop-1)`) ; flush gauche = pas d'indent
3. **Décalage des blocs entre eux** — un bloc est-il décalé horizontalement par rapport aux autres ? (ex. liste décalée de `--grid-col-desktop-1` / `--space-20` en mobile)
4. **Overlap vertical** — les blocs se chevauchent-ils ? Si oui, valeur du recouvrement (`margin-top` négatif)
5. **Alignement desktop vs mobile** — même structure ou reflow structurel ?

Si l'une de ces informations manque au moment de démarrer l'implémentation, la demander avant de coder.

**Pattern d'implémentation** : flex-column + `width` via token grille + `margin-top` négatif pour l'overlap. Éviter CSS grid sauf si le layout est réellement bi-dimensionnel (cf. bento).

## Ne pas faire

- Ne pas commiter `.env` ni les fichiers `.rtf` (clés S3 dedans)
- Ne pas utiliser de tailles fixes — toujours passer par les tokens Utopia
- Ne pas éditer `colors.json` ni `_tokens.scss` à la main (générés depuis Figma) — passer par Figma puis `npm run tokens:colors`
- Produit B (`design-system.html` / `color-manager.js`) est **gelé** sur ce projet : ne pas l'utiliser comme éditeur de couleurs
