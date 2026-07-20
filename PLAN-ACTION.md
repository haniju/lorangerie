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

### Contenu (variables string) — FAIT
`Figma → export brut → tokens.textes.json → figma-to-content.js → textes.json (consommable) + inclusive-report.json + inclusive-lexicon.json`
`scripts/figma-to-content.js` (jumeau de `figma-to-colors.js`, `npm run content:sync`) aplatit le DTCG et unifie les 3 modalités d'écriture inclusive vers le point médian `·`. `Tarif.astro`, `Partenaire.astro`, `Fonctionnement.astro`, `Pulpe.astro` consomment `textes.json`. Restent hardcodés : `Coworking.astro`, `Hero.astro`, `Navbar.astro`, `IndexNav.astro` (labels).

> Écriture inclusive : voir **[INCLUSIVE-WRITING.md](INCLUSIVE-WRITING.md)**. Le rapport avant/après (`src/data/inclusive-report.json`) liste 4 formes orales encore **à valider** à la main (statut `à-valider`) avant de peupler `inclusive-lexicon.json` : `fait·e`, `Copulpeur·euse`, `entrepreneur·e·s`, `usagers·ères` (cette dernière, absente du tableau §3 d'origine, détectée par le script). Le composant `<Incl>` (rendu aria stratégie B) reste à construire.

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

### Implémentation réalisée — scrollspy « machine à états dérivée »

Le scrollspy vivant (`initIndexNavScrollspy`, `src/js/index-nav.ts`) remplace l'IO double
envisagé par une **machine à états dérivée du scroll** : à chaque frame on lit la géométrie
(deco vs dot, deco vs section) et on **recalcule** le stade de chaque étiquette — l'état n'est
jamais accumulé, donc la remontée rejoue exactement la chorégraphie à l'envers.

**Deux acteurs**
- `.index-nav__label` (dans `IndexNav.astro`) — l'étiquette du rail, une par section.
- `.index-nav__deco` (`h2` dans chaque section, `data-label-for`) — miroir décoratif `sticky`
  qui « voyage » vers le rail. *(anciennement `.section-label-deco`.)*

> **TEST en cours (2026-07)** — le modèle est passé de 5 à **4 états** : `--actif` a été retiré,
> `--bellow` ne dépend plus des sentinelles, et `--collapse-after` utilise un nouveau repère
> (« dernier dot de la liste »). Détail des triggers ci-dessous ; à valider avant de considérer
> ce modèle comme définitif (cf. points ouverts en fin de section).

**4 états de l'étiquette de rail**, franchis dans l'ordre au scroll descendant :
`collapse-before → start → bellow → collapse-after`

Taille = celle du **label** (grand/petit). Le **dot** est de taille **uniforme (petit)** sur tous
les états ; seule sa **couleur** varie (`sapin-60` en start/bellow, normal sinon).

| État (`.index-nav__item--…`) | Label | Dot | Visibility | Trigger |
|---|---|---|---|---|
| `collapse-before` | grand | petit | hidden | défaut, jamais atteint |
| `start` | grand | petit · sapin-60 | **visible** | deco croise son **propre** dot miroir (`isStart` : `decoTop ≤ dotTop`) |
| `bellow` | petit | petit · sapin-60 | **visible** | la **`<section>`** elle-même touche le haut de l'écran (`isSectionAtTop` : `sectionTop ≤ 0`) |
| `collapse-after` | petit | petit · normal | hidden | la deco de la section **suivante** croise le dot du **dernier item de la liste** (`crossedLastDot`) |

**Position découplée du reveal** — c'est le point le plus subtil du modèle actuel. `isStart`
(reveal, `decoTop ≤ dotTop`) déclenche bien avant que la deco n'atteigne son vrai point de collage.
Si l'étiquette dockait (translate vers le haut) au même instant que le reveal, elle apparaîtrait
directement calée en haut — sans transition, un comportement jugé cassé (c'était le rôle qu'assurait
l'ex-`--actif`, en pré-positionnant *invisible* avant que `--start` ne révèle). Le modèle actuel
sépare donc en deux fonctions distinctes :
- `isStart(entry)` → reveal (classe `--start`, visibilité).
- `isDocked(entry)` → `decoTop ≤ stickyTopPx` (l'ancien seuil, repris tel quel) → autorise le
  docking (translate réel vers la position 1).

Tant qu'un item est `--start` mais **pas encore docké**, `updateScrollspy` force
`--label-to-first: 0px` sur cet item (après le calcul normal des offsets) → le label reste à
**sa position naturelle** dans le flux du rail. Dès que `isDocked` devient vrai (au fil du
scroll), le vrai offset reprend la main et le label migre vers le haut. *(Sans deco — coworking —
`isDocked` renvoie toujours vrai : offset ≈ 0 de toute façon, item déjà en position 1.)*

> Trigger `collapse-after` — dernier repère (2026-07) : câblé sur `crossedLastDot(next)`, PAS sur
> `isStart(next)`. `lastDot` = le dot du **dernier** item du rail (`partenaires`), capté une fois
> à l'init. La deco entrante descend vers le haut de l'écran et croise ce dot (le plus bas de la
> liste) bien **avant** d'atteindre son propre miroir → l'item précédent disparaît plus tôt que
> si le trigger restait sur le miroir de la section suivante. Cas particulier auto-cohérent : pour
> l'avant-dernière section, `next` EST le dernier item → `crossedLastDot(next) ≡ isStart(next)`,
> aucun cas spécial à coder. `collapse-after` étant prioritaire dans `stageOf`, ce trigger peut
> court-circuiter `bellow` pour une section courte — comportement voulu, pas un bug.

> Refactor dots (2026-07) : (1) `--collapse-before` passé en petite taille de label (comme `--bellow`) ;
> (2) taille du dot uniformisée (petite partout) — supprime le décalage horizontal dû au `left`
> qui dépendait de `--dot-size`. Le rond visuel est `.index-nav__dot-core` dans l'enveloppe paddée `.index-nav__dot`.

La `.index-nav__deco` se masque **peu après** le passage `collapse-before → start` (et non plus
au passage `bellow`) : `isStart()` n'étant pas figé (contrairement à l'ancien repère "sticky"), le
JS mémorise le `scrollTop` du franchissement (`entry.startScrollTop`) puis masque la deco
`DECO_HIDE_AFTER_START_PX` (2px) de scroll plus loin. Réversible à la remontée.
`aria-current` posé sur l'item en `start` (R15). *(coworking, sans deco, démarre en `start`.)*

**Deux pièges résolus (repères de coordonnées)**
- **`stickyTopPx`** = ligne du rail en coords **viewport**, lue sur `.index-nav`
  (`calc(nav-height + index-nav-gap)`), PAS le `top` de la deco (relatif à `main`, décalé de
  `nav-height` via son `margin-top`). Sinon `isDocked` ne se déclenche jamais.
- **`--label-to-first`** (offset translateY qui docke l'étiquette N sur la position de l'item 1)
  **n'est pas invariant** : les hauteurs du rail changent au scroll (grande ↔ petite). Il est donc
  recalculé à **chaque frame, après** application des classes d'état. Le `transform` du label
  n'affecte pas la boîte de l'`<a>` mesurée → pas de boucle de rétroaction.

**Empilement** : les étiquettes sont dockées au même endroit ; l'ordre de peinture = ordre DOM,
donc l'étiquette N+1 recouvre la N (règle « la 2 au-dessus de la 1 »). Aucun `z-index` nécessaire.

**Sentinelles — laissées de côté pour ce test** : `[data-sentinel-for="<id>"]` reste dans le
markup de chaque section (`Coworking.astro`, `Fonctionnement.astro`, `Tarif.astro`, `Pulpe.astro`,
`Partenaire.astro`) mais **n'est plus lu par le scrollspy** (`passed()`/`entry.sentinel` retirés
de `index-nav.ts`). `bellow` utilise désormais `entry.section` (la `<section>` elle-même, captée
via `document.getElementById(entry.id)`). À trancher : si ce modèle est validé, retirer les
attributs `data-sentinel-for` du markup (dette sinon — deux mécanismes qui se chevauchent).

**Reste à implémenter**
- Mobile : appliquer les tailles `--mobile` via media query dans le rail (pas via classe JS).
- R9 : hover sur la colonne → tous les dots grands + gap augmenté (reste séparé du hover par-dot
  ci-dessous, cf. `IndexNav.astro`/`_index-nav.scss` — pas encore construit).
- Interactions `--collapsed` (hover/touch-hold) : conservées pour la démo DS, non branchées sur
  le rail vivant qui est désormais piloté au scroll.
- **Mobile — touch-and-hold rétabli** (voir note ci-dessous).
- Valider le modèle à 4 états (test 2026-07) puis, si retenu, nettoyer le markup des sentinelles
  et mettre à jour cette note.

> **Note pour l'ingénieur — Mobile touch-and-hold (résolu, 2026-07)**
>
> Cause : `initIndexNavTouch()` (`src/js/index-nav.ts`) ciblait `.index-nav__item--collapsed`,
> classe posée par l'ancien modèle à 5 stades mais **plus jamais** par le scrollspy vivant
> (passé à 4 stades `collapse-before / start / bellow / collapse-after`) — le JS de touch
> tournait dans le vide sur `index.astro`. Seule la démo Design System (markup statique
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
> à retirer ou documenter explicitement comme tel si le modèle à 4 états est validé.

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
