# Journal de modifications & améliorations — L'Orangerie

> Log chronologique inverse (le plus récent en haut) des changements d'infra, décisions d'archi et améliorations à prévoir. Complète PLAN-ACTION.md (exécution) et SITE-PLAN.md (structure).

---

## 2026-07-06

### Phase 3 (amorce) — Navbar : premier composant Figma

Début de la récupération des composants depuis Figma. Premier : `nav/NAVBAR` (32:2502, desktop).

- **`src/components/Navbar.astro`** reconstruit depuis Figma : logo texte (`--font-display` iCiel Cadena, uppercase), 3 `bouton/nav-primary` (Découvrir / F.A.Q. / Nous contacter, actif = `aria-current` → soulignement + bordure `warm`), 1 `bouton/nav-secondary` CTA (« Réserver ma place » + picto).
- **`src/scss/components/_buttons.scss`** (neuf) : `.btn--nav-primary` / `.btn--nav-secondary` mappés sur les tokens `action/nav/*` + `--space-*` Figma.
- **`src/scss/layout/_navbar.scss`** (neuf) : `.navbar` (fond `background/nav`, hauteur `--space-50`, padding `--space-20`).
- **Picto** `assets/picto/demi-orange` téléchargé → `src/assets/pictos/demi-orange.svg`, couleurs passées en `currentColor` (hérite du texte du CTA), importé en composant SVG Astro.
- **Token `--font-display`** ajouté à `_tokens.scss` (le logo était le bon moment).

**Gap tokens Figma** : `action/NAV/dark` (#213d2c) et `action/NAV/warm` (#fdbb91) existent dans Figma mais **hors de la sélection exportée** (66 vars) → absents du pipeline. Référencés en **primitives interim** (`--sapin-80`, `--peche-80`) dans navbar/buttons. → **à ajouter à l'export Figma** puis re-`npm run tokens:colors` pour les remplacer par les vrais tokens sémantiques.

**Navbar mobile** (44:3492, h.62) faite : bascule structurelle à `56rem` (liens inline ↔ hamburger), fond sable/20, CTA + bouton hamburger (`aria-expanded`/`aria-controls`, script inline). Le hamburger ouvre un panneau qui **empile les mêmes composants liens** (l'état « menu ouvert » n'existe pas dans le node Figma → traitement minimal).

**Reste sur la navbar** : picto CTA mobile = `demi-orange` réutilisé au lieu de `quartier` (5 fragments raster — à exporter en 1 SVG si on veut l'exact) ; confirmer le design d'ouverture du menu s'il existe ; href réel du CTA « Réserver » ; contenu nav à basculer sur `textes.json`.

### Phase 1b — Purge du placeholder legacy

Décision utilisateur : **on ne remappe pas le legacy, on le supprime** — on ne garde que ce qui sera (re)construit depuis Figma. Texte principal fixé sur `--text-cold-dark`.

- **Supprimés** : `_typography.scss`, `_buttons.scss`, `_form.scss`, `_table.scss`, `_footer.scss`, `pages/_home.scss`, `pages/_contact.scss` ; data factices `home.json`, `nav.json`, `contact.json`, `design-system.json`.
- **`_reset.scss`** recâblé sur les vrais tokens : fond `--light-neutral` (sable/05), texte `--text-cold-dark` (sapin/90). Plus aucun token `--color-*` cassé dans la chaîne live.
- **Pages** `index`/`contact` réduites à des coquilles Layout (contenu à venir de Figma).
- **Conservé** : infra (pipelines tokens/fluide, `_reset`, `_fonts`, `_tokens`, `_fluid`, `_grid`, Layout, Navbar/Footer squelettes) ; sources Figma (`textes.json`, `faq.json`, `colors.json`, `tokens.colors.json`, `tokens.fluid.json`) ; **Produit B gelé** (`_color-picker.scss`, `_design-system.scss`, `design-system.html`, `src/js/colors`) laissé intact (règle « ne pas supprimer »).
- Chaîne SCSS live réduite à : `fonts, tokens, fluid, reset, grid`.

### Phase 1a — Twin fluide (Option C : hybride)

**Décision** : après inventaire des variables Figma (via MCP `get_variable_defs` sur les frames `home-desktop` 36:2815 et `home-mobile` 38:3195), constat que **Figma n'expose PAS de paires desktop/mobile par variable** :
- barème d'espacement **px FIXE**, identique aux deux breakpoints (`spacing/padding/7,10,20,30,40,50,70`, `grid-layout/padding=8`, `padding/40-7=34`) ;
- `corners` fixes (8/25/80/170), `Stroke` fixes (1/4/33) ;
- le responsive est porté par des **variables distinctes nommées** `*_desktop` / `*_mobile`, pas par des modes : padding de grille `Padding_mobile=20` → `SIZES/paddings/grid=60`, display `d_mobile=40` → `d_desktop=60`, h1 `26` → `36`, bouton `button/mobile=62`.

→ La prémisse initiale de `generate-fluid.js` (« exporter chaque FLOAT avec ses valeurs desktop/mobile pour en faire des clamp() ») ne colle pas au fichier. **Retenu : Option C (hybride)** :
- **espacements internes** = barème Figma en **rem fixes** (`--space-7…--space-70`), fidèles au px de la maquette ;
- **corners / strokes** = tokens fixes (`--corner-*`, `--stroke-*`) ;
- **quantités à 2 bornes** = `clamp()` fluide calibré **440→1280** (`--pad-grid` 20→60, `--step-display` 40→60, `--step-h1` 26→36).

**Pipeline** : `tokens.fluid.json` (source, seedée depuis l'extraction MCP en attendant l'export FLOAT du plugin) → `scripts/generate-fluid.js` → `src/scss/base/_fluid.scss` (généré, ne pas éditer à la main). Jumeau du pipeline couleurs.

### À faire / améliorations notées
- **CLAUDE.md** : assouplir la règle « ne jamais hardcoder des tailles en px/rem fixes ». Elle est incompatible avec la maquette réelle (barème px fixe) et avec l'Option C retenue. Reformuler : *fluide (clamp Utopia) pour le cadre & la typo à 2 bornes ; rem fixes issus de Figma pour les espacements internes de composants*.
- **Ladder Utopia legacy** dans `_tokens.scss` (échelles `--step-*`/`--space-s/m/l` calibrées 360/1240) : **supersédée** par `_fluid.scss` mais encore référencée par `_typography.scss` / `_grid.scss`. À retirer au fur et à mesure de la migration typo (Phase 3).
- **`_reset.scss` / `_footer.scss`** : référencent des tokens sémantiques **inexistants** (`--color-text-primary`, `--color-bg-light`, `--color-border`, `--color-border-strong`, `--color-text-secondary`), reliquats d'avant le passage Figma-first. À mapper sur les vrais tokens (`--text-warm-dark`/`--text-cold-dark`, `--light-neutral`, `--background-nav`…) — décision de mapping à trancher.
- **`--font-display`** (iCiel Cadena) : `@font-face` posé, token à ajouter en Phase 1/3 (logotype). Cf. mémoire projet.
- **Plugin FLOAT export** : à terme, le plugin Figma doit exporter les FLOAT (spacing/corners/strokes/type) pour que `tokens.fluid.json` soit généré, pas seedé à la main.

---

## 2026-07-05 / 07-06

### Phase 0 — Migration Vite/HTML-vanilla → Astro

- Passage à **Astro** (tourne sur Vite → plugins Vite conservés, build statique `dist/`, `deploy.sh` inchangé).
- **Node 20 → 22.23.1** (nvm `default`, `.nvmrc` ajouté) pour débloquer **Astro 7.0.6** (7 exige Node ≥ 22.12).
- `astro.config.mjs` réinjecte `vite-plugin-colors.js` via `vite.plugins` (endpoint `/__api/colors` vérifié OK sous Astro).
- Structure : `src/layouts/Layout.astro` + `src/components/{Navbar,Footer}.astro` (partagés, fin de la duplication multi-page) ; pages `index`, `contact` portées + coquilles `faq`, `mentions-legales`, `cgv`, `404`.
- **Polices** : servies depuis `public/fonts/` en URLs absolues `/fonts/...` (les `url()` relatifs à travers la chaîne Sass→Vite sont fragiles d'une version à l'autre — cf. gotcha Dart Sass). `@font-face` iCiel Cadena ajouté. `src/assets/font/` reste l'archive source.
- **Nettoyage** : SCSS legacy condamné supprimé (`_nav.scss`, `_scroll-line.scss`, `_color-tabs.scss`), anciens `index.html`/`contact.html` retirés, `vite.config.js` supprimé, `arbo.txt` gitignoré. Produit B (color-manager) gelé, laissé hors du routing Astro.
