# Plan d'action — Intégration L'Orangerie

> Document de référence. Consolide les décisions prises pour l'intégration de la maquette Figma vers le site en production. Sert de fil conducteur au développement.

> **PLAN-ACTION = exécution** (phases, todo, décisions). **[SITE-PLAN.md](SITE-PLAN.md) = référence structurelle** (cartographie des sections, composants et node-IDs Figma). Les deux se lisent ensemble ; en cas de doute sur un node ou un composant, SITE-PLAN fait foi.

---

## Décisions verrouillées

| Sujet | Décision |
|---|---|
| **Framework** | **Astro** (tourne sur Vite → conserve deploy, plugins Vite, `src/`, scripts) |
| **Source de vérité couleurs** | **Figma-first** — `tokens.colors.json` fait foi ; `colors.json` devient un artefact généré |
| **Responsive** | Contenu **plafonné à 1550px** + marges fluides ; scaling `clamp()` (Utopia) entre mobile 440 et desktop 1280, puis contenu figé + marges qui grandissent |
| **Fond** | **Plat, sable/05 (`#fcf7f3`)** pour l'instant ; light field (gradient canvas) différé en Phase 7 |
| **Carousels** | **Embla** (bento mobile + section pulpe) |
| **Carte (contact)** | **Leaflet + OpenStreetMap** (sans clé, RGPD-safe, marqueur aux couleurs du lieu) |
| **Formulaire contact** | 4 champs : **nom, email, objet, message** |
| **Index / dot-nav** | Règles R1–R15 (ci-dessous) ; 5 puces, hero + footer exclus |
| **Fruits décoratifs** | **Purgés** (kiwi, tasse, laptop, plante, framboise, orange) ; remplacés par serpentins |
| **Écriture inclusive** | Spec de référence : [INCLUSIVE-WRITING.md](INCLUSIVE-WRITING.md) |
| **Logotype `display`** | **Texte pur** (police iCiel Cadena), PAS d'asset SVG |
| **Logo Pulpe (index)** | Affiché dans l'étiquette d'index de `pulpe` (nodes `181:3025` mobile / `513:8772` desktop détaché) ; label résiduel « Nos tarifs » à ignorer/nettoyer |
| **Produit B (color-manager)** | **Gelé** sur ce projet — ne pas utiliser, n'édite plus `colors.json` |
| **Boutons morts** | `bouton/charte` et `bouton/primary_back` → ignorés |
| **Assets** | **Jamais téléchargés depuis Figma.** Tous en local dans `src/assets/` (`images/` photos, `svg/` illustrations, `pictos/`, `logos/`), nommés **en miroir du naming Figma**. Workflow : récupérer le nom Figma → chercher le fichier local dans le bon dossier |
| **Fonds de blocs** | **Pas de glassmorphism / backdrop-blur.** Les encarts texte sont sur **fond simple/absent** |

---

## Architecture cible

Site **one-page** (home) + pages annexes, en Astro.

```
src/
  pages/            index.astro, contact.astro, faq.astro,
                    mentions-legales.astro, cgv.astro, 404.astro
  components/       atomes, composants, boutons, nav (ex-Figma atomic design)
  layouts/          Layout.astro (navbar + footer partagés)
  data/             tokens.colors.json (source), colors.json (généré),
                    textes.json, home.json, nav.json, contact.json, faq.json
  scss/             base / components / layout / pages / utilities
  assets/           font, images, logos, pictos, svg
scripts/            figma-to-colors.js, generate-tokens.js,
                    figma-to-content.js*, generate-fluid.js*
  (*à créer)
vite-plugin-colors.js   (via astro.config → vite.plugins)
```

**Gain clé d'Astro** : navbar + footer en composants uniques (fin de la duplication multi-page), routing par fichiers, `astro:assets` (optimisation AVIF/WebP native).

---

## Pipeline de tokens

### Couleurs — FAIT
`Figma → plugin (export) → tokens.colors.json → figma-to-colors.js → colors.json → generate-tokens.js → _tokens.scss`
Voir [README-tokens-couleur.md](README-tokens-couleur.md). Le plugin exporte l'`id` Figma stable (propagation de renommage).

- **Format canonique = l'arbre profond** `collections.<c>.tree` de `tokens.colors.json`. Le miroir plat `variables[]` de l'export est **obsolète** (ne pas l'utiliser).
- `tokens.colors.json` actuel = export d'une **sélection** (66 variables utiles), renommé. **C'est voulu.**
- Génération SCSS : les primitives `_base` sortent **en valeur** (`--sapin-80: #213D2C`) ; les tokens sémantiques sortent **en référence** (`--action-button-primary-initial: var(--sapin-80)`).
- `colors.json` est **généré, ne pas l'éditer** (le Produit B / color-manager est gelé, cf. Décisions).

### Fluide (espacement + typo) — À FAIRE (net-neuf)
Twin de `generate-tokens.js` : **`generate-fluid.js`** génère les échelles `clamp()` Utopia (`--space-*`, `--step-*`) à partir des bornes mobile 440 / desktop 1280 (plafond 1550).
Prérequis : le plugin doit aussi exporter les variables **FLOAT** (espacements, corners) avec leurs valeurs desktop/mobile.

### Contenu (variables string) — À FAIRE
Le fichier réel `src/data/textes.json` est aujourd'hui un **export brut Figma** (format DTCG `modes/$type/$value`). Il lui manque son transform twin **`scripts/figma-to-content.js`** (jumeau de `figma-to-colors.js`) qui produira un `textes.json` **consommable** par les composants, la FAQ et le futur skill `inclusive-writing`.

> Écriture inclusive : voir **[INCLUSIVE-WRITING.md](INCLUSIVE-WRITING.md)**. Spec du transform `figma-to-content.js` : **fournie séparément — placeholder, ne pas inventer.**

---

## Système d'index (dot-nav) — Règles R1–R15

**Positionnement & apparition**
- **R1** — Rail ancré en bas de la Hero ; hors viewport à `scrollY = 0`.
- **R2** — Dès que le scroll l'atteint : `sticky` en haut du viewport, jusqu'au bas de page.
- **R3** — Un point = une section (5 sections nav ; hero + footer exclus), dans l'ordre du document.

**Section active & étiquette**
- **R4** — Section active = dont le haut a été franchi le plus récemment (Intersection Observer). Une seule active.
- **R5** — Défaut : point actif **grand**, autres **petits**, gap petit.
- **R6** — Seule l'étiquette de la section active est visible.
- **R7** — Entrée de section : pastille grande + étiquette visible (`start`).
- **R8** — Après **300px** au-delà du haut de la section active : pastille + étiquette **rétrécissent en petit mais restent visibles**, jusqu'à la section suivante (où R7 se redéclenche pour elle). L'étiquette active est **toujours** affichée.

**Interaction desktop (hover)**
- **R9** — Survol de la colonne : tous les points grands **et padding entre points augmenté** (le rail s'aère).
- **R10** — Survol d'un point : son étiquette s'affiche en petit.
- **R11** — Sortie du survol : retour à l'état dicté par le scroll.

**Interaction mobile (touch & drag)**
- **R12** — Idem R9–R10 par **touch-and-drag** le long du rail ; le point sous le doigt affiche son étiquette.
- **R13** — Navigation (smooth scroll) au **relâchement du hold sur l'étiquette dépliée**.

**Transitions & accessibilité**
- **R14** — Changements de taille animés ; désactivés sous `prefers-reduced-motion`.
- **R15** — Points focusables au clavier (Entrée = aller à la section), `aria-current` sur l'active.

Mapping Figma : `statut=start` = R7 ; `statut=bellow` = R10/R12 ; `statut=constant`/`collapsed` = R5/R8. Variantes `figma_*` = hors code. En code, l'étiquette d'index **appartient à sa section** (point d'ancrage du scrollspy).

### Implémentation réalisée — boutons & rail DS

**Composant `.index-nav__item` (`_index-nav.scss` + `src/js/index-nav.ts`)**

- Dot en `position: absolute` dans la marge gauche : `left: calc(-1 * (var(--pad-grid) / 2 + var(--dot-size) / 2))` → centré dans `--pad-grid`, suit la marge fluide.
- Label en flux (non-collapsed) → `left: 0` = aligné avec le bord contenu.
- `::after` invisible `right: -20rem` sur `--collapsed` → zone de hover bridgeant le gap dot↔label sans décalage du dot.
- `::before` sur `.index-nav__dot` → zone de hit élargie (`inset: -0.5rem`).
- Sentinel scrollspy : utiliser des éléments existants de chaque section (classe `.js-section-deep` ou `data-sentinel`) plutôt que des `<div>` vides — l'apparition de l'élément déclenche R8.

**Interactions `--collapsed`**
- Desktop : reveal au `:hover` (label en `initial`) → `:hover` sur label (état `hover`) → `:active` (état `pressed`). Slide `translateX(-6px → 0)` + `opacity`.
- Mobile : **touch-and-hold** (300 ms) → label `initial` (`is-touch-held`) ; glissement sur label → `pressed` (`is-label-pressed`) ; glissement vers autre dot → transfert du hold ; relâchement → reset. **Scroll lock** (`preventDefault` sur `touchmove` non-passif) pendant le hold.
- Protections : `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`, `contextmenu → preventDefault`.

**Architecture fichiers**
- CSS : `src/scss/components/_index-nav.scss` — modèles statiques + rail `.index-nav` + styles DS démo.
- JS : `src/js/index-nav.ts` — `initIndexNavTouch(root?)` exportée, importée par les pages/composants.
- Le composant vivant (`IndexNav.astro`) et le scrollspy (Intersection Observer double : section active + sentinel deep) restent à implémenter.

### Implémentation réalisée — composant vivant `IndexNav.astro`

**Positionnement (divergence vs plan initial)**

Le plan (R1–R2) envisageait `position: sticky` ancré en bas du hero. En pratique :
- `position: sticky` ne persiste pas au-delà du containing block de l'élément — problème pour un nav qui couvre 5 sections.
- `position: fixed` a été retenu. Le composant est placé **en premier enfant de `<main>`** (avant `<Hero />`) pour être rencontré en tête par les lecteurs d'écran, juste après la navbar.
- Le scroll de la page se passe sur `<main>` (html/body ont `overflow: hidden`, main a `overflow-y: auto`) → l'event listener est branché sur `document.querySelector('main')`, pas sur `window`.

**Animation d'entrée (divergence vs plan initial)**

Pas de fade — le nav suit le **top de `#coworking` en temps réel** via un scroll listener :
```
translate = max(0, coworking.getBoundingClientRect().top - getComputedStyle(nav).top)
nav.style.transform = `translateY(${translate}px)`
```
Au chargement le nav est sous le fold (translate ≈ hauteur hero). Il remonte 1:1 avec le scroll jusqu'à se caler à `top: var(--space-30)`.

**Zone hover `::after` (ajustement)**

`right: -20rem` remplacé par `width: calc(var(--dot-size) + var(--space-10) + 12.5rem)` — taille fixe depuis le dot, indépendante de la largeur du conteneur (évite un débordement de ~800px constaté avec `display: block` + `right` négatif).

**État initial**

Premier item en `--start` (hardcodé dans `IndexNav.astro`). Les 4 autres en `--collapsed`. Le scrollspy (Intersection Observer) prendra le relais pour gérer les transitions dynamiques.

### Implémentation réalisée — scrollspy « machine à états dérivée » (validé, 2026-07)

Le scrollspy vivant (`initIndexNavScrollspy`, `src/js/index-nav.ts`) est une **machine à états
dérivée du scroll** : à chaque frame on relit la géométrie (`getBoundingClientRect()`) et on
**recalcule** le stade de chaque étiquette — rien n'est accumulé, donc la remontée rejoue
exactement la chorégraphie à l'envers, par construction. Vérifié en conditions réelles (balayage
fin de toute la page, scroll descendant ET remontant) : progression propre à 5 stades pour les 5
sections, aucune oscillation, symétrie exacte à la remontée.

**Deux acteurs**
- `.index-nav__label` (dans `IndexNav.astro`) — l'étiquette du rail, une par section.
- `.index-nav__deco` (`<h2>` dans chaque section, `data-label-for`) — miroir décoratif `sticky`
  qui « voyage » vers le rail. Réactivé sur `coworking` (était commenté) : **plus de cas
  spécial pour cette section** dans le JS, elle suit la même mécanique que les 4 autres.

**Architecture — 5 stades** (retour à la spec d'origine ; un raccourci à 4 stades testé
précédemment fusionnait `actif` dans `start`, ce qui supprimait la fenêtre invisible permettant à
`--label-to-first` de se positionner en silence avant reveal, et causait un saut visible à
l'apparition) :

| Stade | Classe CSS | Label visible | Déclenché par |
|---|---|---|---|
| `Before` | `--collapse-before` | non | défaut, avant tout trigger |
| `Actif` | `--actif` | **non** | T2 |
| `Start` | `--start` | oui | T4 |
| `Bellow` | `--bellow` | oui | T5 |
| `After` | `--collapse-after` | non | T1 (prioritaire, écrase tout le reste) |

Taille = celle du **label** (grand en actif/start, petit sinon). Le **dot** est de taille
**uniforme (petit)** sur tous les stades ; seule sa **couleur** varie (`sapin-60` en
actif/start/bellow, normale sinon).

**Mécanisme de déclenchement — sentinels géométriques.** Plus aucun trigger ne dépend d'un
`scrollTop` mémorisé ou verrouillé : tout est dérivé de la géométrie live à chaque frame, donc
réversible par construction (symétrie scroll down / scroll up, vérifiée).

| Trigger | Nom code | Repère mesuré | Compare à | Placement DOM |
|---|---|---|---|---|
| T1 | `sentinelAfter` (`[data-sentinel-after]`) | offset **négatif** (`-175px`, avant le début de la section suivante) | `stickyTopPx` | `<span>` posé dans la `<section>`, juste après le `<h2 class="index-nav__deco">` |
| T2 | `isActif()` | top de l'**item** lui-même (`entry.item`, pas le dot) | top du deco | — (pas un sentinel DOM) |
| T3 | — (pas un stade) | top du deco | `stickyTopPx` | — (sert de ligne de référence conceptuelle, pas mesuré directement dans le code) |
| T4 | `sentinelStart` (`[data-sentinel-start]`) | offset `+200px` | `stickyTopPx` | idem T1 |
| T5 | `sentinelBellow` (`[data-sentinel-bellow]`) | offset `+300px` | `stickyTopPx` | idem T1 |

**Placement DOM réel des sentinels** — les trois (`start`/`bellow`/`after`) sont des `<span
class="index-sentinel">` **frères** du `<h2 class="index-nav__deco">`, tous enfants directs de la
`<section>` (pas nichés dans le `<h2>`). Positionnés en `position: absolute` (non-sticky) avec un
`top` fixe en pixels (`--index-start-offset`/`--index-bellow-offset`/`--index-after-offset`,
tous à leur valeur de fallback aujourd'hui — voir plus bas). N'étant **pas** sticky, leur position
viewport évolue de façon strictement monotone avec le scroll : chaque sentinel franchit
`stickyTopPx` **exactement une fois** par passage de section, ce qui suffit à un déclenchement
stable sans dépendre du comportement (sticky, non-monotone une fois docké) du deco lui-même.

**Valeurs des offsets** — `--index-start-offset`, `--index-bellow-offset` et
`--index-after-offset` sont référencées via `var(--x, fallback)` dans `_index-nav.scss` mais
**ne sont déclarées nulle part dans `:root`** : ce sont donc les valeurs de **fallback** qui
s'appliquent réellement, soit `200px` / `300px` / `175px`. Retouchables par tâtonnement visuel en
les déclarant dans `:root` (aucune n'est déduite d'un calcul).

```scss
[data-sentinel-start]  { top: var(--index-start-offset, 200px); }
[data-sentinel-bellow] { top: var(--index-bellow-offset, 300px); }
[data-sentinel-after]  { top: calc(var(--index-after-offset, 175px) * -1); }
```

**T2 (`isActif`) mesuré contre le top de l'item, pas le dot** — le dot est centré (`top: 50%`)
*dans* l'item, donc sa position bouge avec la hauteur de l'item — y compris au survol, qui fait
passer un item encore `collapse-before`/`collapse-after` à la hauteur « bellow » sans changer son
stage. Le top de l'item, en flex-column, ne dépend que des items **au-dessus**, jamais de sa
propre hauteur → immunisé contre ce bruit.

**Deco masqué** — dérivé directement de `stage >= Stage.Start` (`decoLabel.classList.toggle(...)`
dans `updateScrollspy`), pas de verrou de scroll séparé : redondant une fois `Actif` réintroduit
comme stade distinct et caché.

**`scroll-margin-top` sur `.u-section` — atterrissage au clic (réécrit, 2026-07)**

Décision abandonnée en cours de route : faire *descendre le rail* (`.index-nav`) au clic pour
qu'il rejoigne le deco de la section ciblée (« chase », piloté par `requestIndexNavChase` +
`--index-nav-chase-y`). Implémenté, testé (Playwright), mais **retiré** sur demande explicite —
le rail reste fixe en permanence ; seule la position d'atterrissage du scroll est réglée.

Cible du scroll = la `<section>` elle-même, **jamais** `.index-nav__deco` directement :
`.index-nav__deco` est `position: sticky`, donc sa bounding box dépend de l'historique de scroll
— une fois qu'on a dépassé sa section, il reste « collé » en bas de son conteneur, et
`scrollIntoView()` / `scroll-margin-top` visé sur un élément sticky cible alors CETTE position
collée, pas son point de départ (bug constaté : atterrissage à la fin de la section au lieu du
début). Cibler la section (jamais sticky) élimine le problème quel que soit le sens du clic.

Le réglage vise maintenant `--index-deco-viewport-target` (`_index-nav.scss`) — où le deco doit
apparaître dans le viewport après le clic, actuellement **37vh** (calibré à l'œil à 1717×909).
Formule (`.u-section`) :
```
scroll-margin-top = target - nav-height - padding-top(section) - margin-top(deco)
```
`.coworking` a son propre override (padding-top: 0, pas de terme à retrancher pour lui).
⚠️ Le target doit rester nettement au-dessus de la ligne de docking (`stickyTopPx +
$item-label-margin`, ~85px) : si le calcul pousse la section trop haut, le deco franchit le seuil
sticky *avant la fin du scroll* et se fait clamper à sa position dockée — le pill atterrit alors
collé aux dots et chevauche le texte au lieu de laisser sa place normale.

⚠️ `.u-section` est également utilisée hors des 5 sections indexées (pages FAQ, contact, mentions
légales, CGV, 404, design-system) — le réglage s'applique donc partout où cette classe est posée,
pas seulement sur le rail (cf. points ouverts).

**Fallback section sans deco** — `console.warn` posé une fois à l'init (pas dans la boucle de
scroll) si `decoLabel` introuvable pour une section ; l'item resterait alors bloqué en `--start`.
Mort dans les faits aujourd'hui (les 5 sections ont toutes leur `.index-nav__deco`, coworking
compris), conservé par défense.

**Empilement** : les étiquettes sont dockées au même endroit ; l'ordre de peinture = ordre DOM,
donc l'étiquette N+1 recouvre la N (règle « la 2 au-dessus de la 1 »). Aucun `z-index` nécessaire.

> **Positionnement horizontal du rail — fix scrollbar (résolu, 2026-07)**
>
> Un décalage horizontal persistant entre `.index-nav__label` et `.index-nav__deco` (visible sur
> écran large avec une scrollbar réelle, pas reproductible en scrollbar overlay/headless) venait
> de deux bases de calcul différentes pour un même alignement visuel :
> - `.u-container` (donc `.index-nav__deco`, enfant de section) se centre via `margin-inline: auto`
>   + `width: 100%`, **relatif à `<main>`** — dont la largeur de contenu disponible est amputée par
>   SA PROPRE scrollbar (`overflow-y: auto`).
> - `.index-nav` (`position: fixed`) se centre via `calc((100vw - content-cap) / 2)` — `100vw`
>   ignore totalement cette scrollbar (elle n'existe qu'à l'intérieur de `main`, pas au niveau
>   document : `html`/`body` sont en `overflow: hidden`).
>
> Les deux formules ne divergent que lorsque la fenêtre dépasse `--content-cap` (1550px, seuil où
> le terme de centrage devient actif des deux côtés) — l'écart vaut alors la moitié de la largeur
> de la scrollbar. `position: fixed` étant structurellement ancré au viewport (jamais à `main`),
> aucune formule CSS pure basée sur `100vw`/`%` ne peut reproduire exactement le centrage de
> `.u-container` tant qu'une scrollbar réelle prend de la place.
>
> **Fix** : mesure JS plutôt que formule CSS. `IndexNav.astro` → `updateNavLeft()` lit
> `coworking.getBoundingClientRect().left` (`#coworking` porte déjà `.u-container`) et pose le
> résultat en `--index-nav-left` sur `.index-nav`, appelée à l'init et sur `resize`.
> `_index-nav.scss` : `.index-nav { left: var(--index-nav-left, ancienne-formule-100vw) }` —
> l'ancienne formule reste en fallback avant que le JS ne prenne la main. Vérifié à 1440/1800/2200px
> et sur redimensionnement : alignement exact, aucune dépendance à la largeur de la scrollbar.

> **Positionnement vertical du label docké — fix inset de centrage (résolu, 2026-07)**
>
> `--label-to-first` (offset `translateY` qui docke le label de l'item N sur la position de
> l'item 1) atterrissait systématiquement 5px trop bas. Cause : chaque hauteur d'item
> (`_index-nav.scss`, `height: calc(Npx + 10px)`) ajoute 10px de plus que la hauteur réelle du
> label — centré via `align-items: center`, le label se retrouve donc à 10px/2 = 5px sous le haut
> de SON PROPRE item, uniformément quel que soit l'état (start/bellow partagent la même
> convention `+10px`). L'ancrage (`items[0].getBoundingClientRect().top`) mesure le haut BRUT de
> la boîte du premier item (son label peut être caché, non mesurable) — sans retrancher cet inset,
> l'inset du label CIBLE s'ajoutait après le docking au lieu de s'annuler avec un inset équivalent
> côté ancrage.
>
> **Fix** (`src/js/index-nav.ts`, `calcLabelOffsets`) : `firstTop = items[0]...top -
> LABEL_TOP_INSET` (constante `5`, dérivée de la convention `+10px` partagée par toutes les
> hauteurs d'item). Vérifié en direct : le label docké atterrit désormais exactement au haut de
> la boîte de l'item 1 (avant : 5px plus bas), en `--start` comme en `--bellow`, sur plusieurs
> sections.

**Reste à implémenter**
- Mobile : appliquer les tailles `--mobile` via media query dans le rail (pas via classe JS).
- R9 : hover sur la colonne → tous les dots grands + gap augmenté (reste séparé du hover par-dot
  ci-dessous, cf. `IndexNav.astro`/`_index-nav.scss` — pas encore construit).
- Interactions `--collapsed` (hover/touch-hold) : conservées pour la démo DS, non branchées sur
  le rail vivant qui est désormais piloté au scroll.

> **Note pour l'ingénieur — Mobile touch-and-hold (résolu, 2026-07)**
>
> Cause (historique) : `initIndexNavTouch()` (`src/js/index-nav.ts`) ciblait
> `.index-nav__item--collapsed`, classe posée par un ancien modèle mais **jamais** par le
> scrollspy vivant (`collapse-before / actif / start / bellow / collapse-after`) — le JS de
> touch tournait dans le vide sur `index.astro`. Seule la démo Design System (markup statique
> avec `--collapsed` en dur) l'exerçait encore, d'où l'écart DS ↔ rail réel.
>
> Fix (miroir du hover desktop déjà en prod, `IndexNav.astro` / `.index-nav__item:hover`) :
> 1. `initIndexNavTouch` généralisé à **tous** les `.index-nav__item` (au lieu du seul
>    `--collapsed`) — peu importe le stade courant, comme le hover desktop.
> 2. Le hold pose `.is-touch-held` ; nouvelle règle CSS `.index-nav__item.is-touch-held
>    .index-nav__label { display: inline-flex; transform: none; }` dans le bloc `.index-nav`
>    vivant (`_index-nav.scss`) — même mécanisme de spécificité (0,3,0) que le hover pour
>    percer le `display:none` des stades repliés.
> 3. Le glissement sur le label pose désormais `.index-nav__item--touch-drag` (classe déjà
>    prévue en CSS pour l'apparence pressed mobile, mais jamais posée par le JS avant ce fix)
>    au lieu de l'ancien `is-label-pressed`, orphelin.
> 4. **R13 implémenté** (ne l'était nulle part avant, ni desktop ni mobile) : relâchement du
>    hold avec `--touch-drag` actif → `target.scrollIntoView({ behavior: 'smooth' | 'auto' })`,
>    nécessaire car le `preventDefault` sur `touchmove` pendant le hold empêche le navigateur
>    de synthétiser le click natif de l'`<a href="#id">`. Respecte `prefers-reduced-motion`.
> 5. Scroll-lock (`preventDefault` sur `touchmove` non-passif pendant le hold) inchangé,
>    maintenant actif puisque le ciblage matche le rail réel.
>
> Reste ouvert : les styles `.index-nav__item--collapsed` dans `_index-nav.scss` restent
> **legacy DS-only** (démo Design System uniquement, non utilisés par le rail vivant) —
> à retirer ou documenter explicitement comme tel si on retire un jour cette démo.

> **Note pour l'ingénieur — Mobile : label bloqué après tap (EN COURS, non résolu, 2026-07-20)**
>
> Régression découverte après le point ci-dessus : après le tap+hold+drag-vers-label R13
> (`navigate()`, `initIndexNavTouch`), le label du rail ne revient pas correctement sous contrôle
> de la state machine (`STAGE_CLASS`) une fois la section chargée — reste visible / mal positionné
> au lieu de repasser en `--collapse-before` et reprendre ses triggers sentinel normalement.
>
> Deux bugs distincts identifiés et corrigés jusqu'ici (mais le symptôme persiste — cf. « reste
> ouvert » ci-dessous) :
> 1. **`pointer-events` non hérité par le reveal.** Le label révélé par `is-touch-held` reste
>    `pointer-events: none` (hérité de la règle de masquage `--collapse-before`/`--actif`, qui ne
>    porte que sur `display`/`transform`, jamais `pointer-events`). Conséquence : le label est
>    *visible* mais jamais hit-testable — `document.elementFromPoint` (dans le handler
>    `touchmove`) retombe systématiquement sur l'item parent, jamais le label, donc
>    `--touch-drag` ne se déclenche jamais via le geste documenté (repli silencieux sur le lien
>    natif `<a href="#id">`, qui masque le symptôme). Fix : `pointer-events: auto` ajouté à la
>    règle de reveal (`.index-nav__item.is-touch-held .index-nav__label`, `_index-nav.scss`).
> 2. **Pas de cycle explicite de reveal/hide autour de `navigate()`.** `clearActive()` (appelé
>    dans `reset()`, juste avant `navigate()`) retire `is-touch-held` immédiatement au lâcher du
>    doigt — sans rien d'autre, le label disparaît avant même que le scroll ait commencé, ou pire,
>    reste bloqué selon l'état exact au moment du relâchement. Fix : nouvelle classe
>    `--nav-pending`, posée par `navigate()` pour toute la durée du scroll (garde le label
>    révélé pendant le trajet), retirée une fois le scroll stabilisé — l'item retombe alors sous
>    contrôle normal de `STAGE_CLASS`.
>    - Détection de fin de scroll : d'abord tentée par **debounce sur l'event `'scroll'`** —
>      abandonnée, la cadence de cet event pendant un scroll natif fluide n'est pas garantie par
>      le navigateur (le debounce pouvait ne jamais se déclencher tout seul, seul un scroll
>      MANUEL de l'utilisateur — relançant l'event — le débloquait). Remplacée par un **polling
>      `requestAnimationFrame`** qui mesure `scrollTop` à chaque frame indépendamment de l'event,
>      avec filet de sécurité (`MAX_FRAMES`, ~5s) si le scroll ne se stabilise jamais.
>
> **Reste ouvert** : malgré les deux fixes ci-dessus (vérifiés isolément via Playwright + touch
> émulé, cf. historique de session), l'utilisateur rapporte en test réel (Chrome DevTools device
> mode) que le label **ne revient toujours pas** dans le flow d'interaction attendu après
> tap+chargement — actuellement en cours de debug direct à l'inspecteur. Hypothèses non encore
> vérifiées : interaction avec le vrai moteur de scroll mobile (inertie/momentum, différent du
> `scrollIntoView` desktop simulé) ; timing réel de stabilisation de `scrollTop` sur device
> potentiellement hors des bornes `STABLE_FRAMES`/`MAX_FRAMES` actuelles ; ou cause encore non
> identifiée empêchant le retour propre à `--collapse-before`. À reprendre avec les observations
> de l'inspecteur avant d'ajuster le code plus loin.

> **Hover par-dot — résolu (2026-07)**, l'ancienne note ci-dessus est obsolète. Deux mécanismes
> distincts cohabitent désormais dans `_index-nav.scss` (repérés `// @hover-reveal`) :
> 1. `.index-nav__item:hover .index-nav__label { display: inline-flex; transform: none }` —
>    reveal **par entrée** : au repos le label est `display:none` donc la boîte de l'`<a>` ≈ le
>    dot seul (déclenchement de fait « sur le point ») ; une fois révélé, la boîte s'étend et
>    englobe dot + gap + label → la zone de hover suit jusqu'au label, qui devient **cliquable**
>    sans perdre le survol (evite le piège « hover reveals unreachable target »).
> 2. `.is-dot-hover .index-nav__item--start .index-nav__label, .is-dot-hover .index-nav__item--bellow .index-nav__label { transform: none }`
>    — au survol de **n'importe quelle** entrée (classe posée par JS via
>    `closest('.index-nav__item')`, `IndexNav.astro`), l'item **affiché** (`start` ou `bellow`)
>    se recale sur son propre dot. Les deux états visibles sont couverts (pas seulement `start`).
>
> R9 (hover colonne → tous les dots grands + gap augmenté) reste **non construit**.

---

## Sections de la home (ordre de scroll)

`hero → coworking → fonctionnement → tarifs → pulpe → partenaires → footer`
(slugs / ancres kebab-case ; index sur les 5 sections centrales.)

Composants (atomic design, classes calquées sur Figma) : `.bento`, `.principes`, `.proposition` (1 composant, 3 axes de modifieurs : emphase / position picto / surface), `.tableau-tarifs` (+ `.forfait`), `.logos-partenaires`, `.bloc-simple` (2 variantes), boutons (`.btn--primary/secondary/fab/nav-primary/nav-secondary`), nav (`.navbar`, `.index-nav`, `.footer`).

---

## Écriture inclusive

> **Spec de référence : [INCLUSIVE-WRITING.md](INCLUSIVE-WRITING.md)** — ce document fait foi.

Le contenu réel (`textes.json`) mélange **au moins 3 modalités** d'écriture inclusive : point médian (`adhérent·e·s`), point (`entrepreneur.e.s`, `habitant.e.s`, `Copulpeur.euse`, `fait.e`) et tiret (`humain-es`) — attention aux **faux positifs** du tiret (`tiers-lieu`, `open-space`, `Suis-je`).

Résumé du périmètre (détail dans INCLUSIVE-WRITING.md) :
- **liste avant/après** stockée de toutes les occurrences ;
- **unification** au point médian **`·` U+00B7** ;
- **formes orales accessibles** validées, exposées via `aria` / `sr-only` ;
- **détection fine** des 3 modalités avec exclusion des faux positifs.

Skill dédié : `inclusive-writing` (alimenté par `figma-to-content.js` / `textes.json`).

---

## Phases d'exécution

**Phase 0 — Socle & migration Astro**
- `npm create astro`, récupérer `src/`, `scripts/`, `vite-plugin-colors.js` (via `astro.config`), `deploy.sh`.
- Brancher le pipeline couleurs (`npm run tokens:colors`) → display sur valeurs Figma.
- Dédoublonner `colors.json`/`tokens.colors.json`, gitignore `.DS_Store`.

**Phase 1 — Fondations tokens & layout**
- `generate-fluid.js` (échelles `clamp()`), stratégie responsive 1550 + marges fluides.
- `Layout.astro` (navbar + footer partagés), fond plat sable/05, reset/base.
- Ajout police **iCiel Cadena** (logotype « L'ORANGERIE »).

**Phase 2 — Tranche verticale : hero**
- Un écran de bout en bout (tokens + fluide + doodle bâtiment), responsive validé. Dé-risque le pipeline.

**Phase 3 — Primitives de composants**
- Boutons (rampe sapin complète), navbar, cartes, composants texte, **système d'index desktop + mobile** (R1–R15), `.proposition`.

**Phase 4 — Sections home**
- Assemblage dans l'ordre structurel, avec **carousels Embla** (bento mobile + pulpe). Contenu depuis `textes.json` (via `figma-to-content.js`).

**Phase 5 — Pages annexes**
- FAQ (accordéon depuis `faq.json`), Contact (formulaire 4 champs + adresse/horaires + carte Leaflet/OSM), Mentions légales (à rédiger), CGV (placeholder), 404.

**Phase 6 — Optimisation photos**
- `astro:assets` (`<Picture>` AVIF/WebP responsive au build), `srcset`/`sizes`, lazy-loading, `width`/`height` (anti-CLS).

**Phase 7 — Light field & motion**
- Moteur du gradient canvas extrait en module client + preset figé (panneau = outil de dev, hors prod). Orbes, grain, voile, parallaxe. `prefers-reduced-motion` respecté.

**Phase 8 — Illustrations**
- Serpentins (emplacements + placeholders puis version finale), doodle bâtiment au halo jaune.

---

## Chantiers transverses (en continu)

- **Accessibilité** — chantier transverse à **toutes les phases**, checkpoint à chaque section :
  - [ ] **Navigation clavier** : ordre de tabulation logique, aucun piège au focus.
  - [ ] **Landmarks + ARIA** : `header` / `nav` / `main` / `footer`, rôles corrects, `aria-current` sur la section active de l'index.
  - [ ] **Focus visible** : style de focus explicite ; jamais `outline: none` sans remplacement.
  - [ ] **Alternatives textuelles** : `alt` sur les photos ; `aria-hidden` sur les décorations (serpentins, doodles).
  - [ ] **Sémantique de l'index / dot-nav** : liste de **liens** navigable, pas seulement des points décoratifs.
  - [ ] **`prefers-reduced-motion` généralisé** (au-delà de R14 et du light field) : GSAP, carousels Embla (**pas d'autoplay**), toute transition.
  - [ ] **Contraste** : checkpoint par section, zone à risque = texte sur **overlays photo** (voiles translucides). *(NB : pas de glassmorphism sur ce projet — décision verrouillée.)*
- **Budget performance** — mesuré dès la tranche verticale.
- **Fil rouge art direction** — « lumière et chaleur de l'orangerie », ancré par « le fer et le verre » (structure).

---

## Contenu hardcodé à connecter à textes.json

- **`IndexNav.astro`** — labels des 5 sections (`coworking`, `fonctionnement`, `tarifs`, `pulpe`, `partenaires`) hardcodés en attendant `figma-to-content.js`. Scanner `IndexNav.astro` et remplacer par les clés `textes.json` une fois le système en place.

---

## Reste à trancher

- Bornes exactes du twin fluide (confirmer 440 / 1280 / plafond 1550) et état des espacements Figma (variables FLOAT ou valeurs d'auto-layout brutes).
- Contenu des Mentions légales (SIRET, hébergeur, directeur·rice de publication).
- Modèle d'index mobile définitif si conflit avec le proto `orangerie_toc_demo.html`.
