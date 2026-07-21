# Fond animé — plan d'intégration WebGL + parallaxe

Note de travail, pas une doc exhaustive. Sert de fil pour la suite de l'implémentation.

## Contexte

Le fond "orbes" (`GradientBackground.astro` / `src/js/gradient-background.js`) est actuellement en Canvas 2D : dégradés radiaux par orbe + grain via `getImageData`/`putImageData`. Ça tournait correctement à taille viewport fixe.

L'ajout du parallaxe (fond plus haut que le viewport, translaté au scroll via GSAP/ScrollTrigger) a fait apparaître du lag : le canvas entier (agrandi par le parallaxe) est redessiné à 60fps, avec des opérations CPU non accélérées (`getImageData`/`putImageData`) qui scalent avec la surface — devenue plusieurs fois celle de l'écran sur une longue page.

## Problématiques soulevées

1. **Canvas 2D ne scale pas** : coût de rendu lié à la surface totale du canvas, pas seulement à ce qui est visible à l'instant T. Le parallaxe (canvas > viewport) aggrave mécaniquement ce problème.
2. **`getImageData`/`putImageData`** pour le grain sont le vrai goulot — non accélérés GPU, coûteux même à taille normale.
3. **Portabilité matériel/OS** :
   - WebGL2 non standard sur Safari avant iOS/Safari 15 (fin 2021) → appareils Apple anciens non mis à jour exclus.
   - Le shader n'a besoin d'aucune feature WebGL2 → cibler WebGL1 directement (support quasi universel depuis 2013, y compris Android ≥4.4).
   - Coût GPU lié à la résolution du framebuffer, pas au nombre d'orbes → DPR élevé (écrans 4K/5K) peut faire exploser le coût si on ne le cappe pas.
   - GPU blacklisté / désactivé (environnements verrouillés, drivers buggés sur Android bas de gamme) → Chrome peut basculer sur SwiftShader (rendu logiciel) ou désactiver WebGL entièrement.
   - Perte de contexte GPU (`webglcontextlost`), plus fréquente sur GPU intégré ancien sous pression mémoire.
   - `precision highp` non garantie sur GPU mobile bas de gamme (Mali/PowerVR/Adreno anciens) → banding si le shader suppose une précision desktop.
   - Batterie/thermique sur mobile ancien avec une boucle GPU continue.

## Options retenues

| Sujet | Décision |
|---|---|
| Rendu | Shader WebGL plein écran (fragment shader, quad unique) — orbes en falloff radial procédural, grain en bruit/hash par pixel. Élimine `getImageData`/`putImageData`. |
| Version API | **WebGL1** explicitement (pas WebGL2 — aucune feature requise, portabilité Safari/Android maximale) |
| Résolution de rendu | Framebuffer cappé indépendamment du `devicePixelRatio` réel (ex. 1× DPR fixe), upscale via CSS — même logique que le cap `dpr:2` déjà en place côté canvas2D, mais plus rentable ici |
| Précision shader | `precision mediump float` explicite partout (pas de `highp`) |
| Parallaxe | Offset de scroll passé en `uniform` (pas de redimensionnement DOM du canvas) — canvas toujours taille viewport, coût constant quelle que soit la hauteur de page |
| Fallback | Détection `getContext('webgl')` + détection renderer logiciel (`WEBGL_debug_renderer_info` → "SwiftShader"/"llvmpipe") → fallback CSS statique (dégradé/couleur unie), jamais retour à l'ancienne implémentation canvas2D |
| Contexte perdu | Écoute `webglcontextlost`/`webglcontextrestored`, réinitialisation propre au lieu de crash |
| Motion | Conserver la pause `visibilitychange` + le frame statique unique en `prefers-reduced-motion` (déjà en place côté canvas2D, à porter tel quel) |

## État actuel (résumé)

La couche **orbes** est passée en WebGL1 et le lag initial est résolu. Le **grain** reste en Canvas2D (`getImageData`/`putImageData`) — pas encore migré, cf. §1. Le **parallaxe** a dévié du plan initial : au lieu d'un `uniform` de scroll (canvas toujours taille viewport), on a gardé l'approche DOM (canvas plus haut que le viewport + translation) mais corrigée et simplifiée — cf. §3, raison du changement expliquée dedans. Nouveauté hors plan initial : un sélecteur de **forme** des orbes (cercle/ellipse/blob organique/polygone), implémenté directement dans le fragment shader (§1bis).

Travail vérifié via Chromium headless (Playwright, installé pour l'occasion) : compilation/liaison du shader, absence d'erreur GL, rendu pixel correct sur plusieurs tailles de canvas, fallback logiciel qui se déclenche proprement dans cet environnement (aucun vrai GPU disponible en sandbox). **Pas de vérification sur GPU matériel réel ni sur mobile** — cf. §4, à faire par l'humain.

## Checklist

### 1. Socle WebGL
- [x] Setup WebGL1 brut (`src/js/webgl-orbs.js`) : quad plein écran, compilation shader, boucle de rendu
- [x] Fragment shader : orbes en falloff radial (remplace les `createRadialGradient` + `multiply`)
- [ ] Fragment shader : grain procédural (hash/noise par pixel + temps, remplace `getImageData`/`putImageData`) — **pas fait**, le grain tourne toujours en Canvas2D (`buildGrain`/`drawGrain` dans `gradient-background.js`). Prochaine étape logique si le grain redevient un point chaud en perf.
- [x] Uniforms pour tous les paramètres pilotés par le panneau (couleurs orbes, couleur de fond, alpha, voile, vitesse, amplitude, taille)
- [x] `precision mediump float` partout ; coordonnées shader normalisées (pas de calcul en pixels bruts) pour rester robuste à la précision réduite — non vérifié sur mobile bas de gamme réel (cf. §4)

### 1bis. Forme des orbes (hors plan initial, ajouté en cours de route)
- [x] Sélecteur de forme dans le panneau : Cercle / Ellipse / Blob organique / Polygone
- [x] Implémenté dans le fragment shader (`shapeDist()`) — aucun coût CPU additionnel, un seul slider "Intensité" dont le sens dépend du mode choisi

### 2. Résolution & perf
- [x] Cap du framebuffer indépendant du DPR réel (`WEBGL_RESOLUTION_SCALE = 1` dans `gradient-background.js`)
- [x] Pause du rAF sur `visibilitychange` (onglet caché / app en arrière-plan)
- [x] Frame statique unique si `prefers-reduced-motion: reduce` (porté du Canvas2D)

### 3. Parallaxe
- [ ] ~~Remplacer le redimensionnement DOM du canvas par un `uniform float uScrollOffset`~~ — **non fait, changement de plan assumé** : une fois les orbes en WebGL, le coût par frame est resté quasi constant même avec un canvas surdimensionné (coût GPU lié à la résolution, pas à la hauteur DOM) — le vrai problème de lag initial était le Canvas2D, pas l'approche DOM en elle-même. On a donc gardé le canvas plus haut que le viewport (`--parallax`, réglable dans le panneau), sans réécrire en uniform shader pour l'instant. À revisiter seulement si un besoin de perf réapparaît.
- [x] Bug trouvé et corrigé : le tween GSAP/ScrollTrigger ne se déclenchait jamais (`trigger` et `scroller` étaient le même élément `main`, cas dégénéré mal mesuré par ScrollTrigger). Remplacé par un listener de scroll direct sur `main`, throttlé par `requestAnimationFrame` — gsap/ScrollTrigger ne sont plus importés dans `gradient-background.js`.
- [x] Intensité du parallaxe exposée comme réglage dans le panneau (0–100 %, defaut 40 %)

### 4. Portabilité / fallback
- [x] Détection `getContext('webgl')` échoué → fallback CSS statique (couleur de fond unie sur `.gradient-bg__inner`, canvas masqué)
- [x] Détection renderer logiciel (`WEBGL_debug_renderer_info` → SwiftShader/llvmpipe/software) → même fallback CSS statique
- [x] Gestion `webglcontextlost` / `webglcontextrestored` → réinit propre, pas de crash
- [ ] **Test réel sur un appareil Android bas de gamme** (ou BrowserStack) — pas fait, aucun accès GPU matériel dans cet environnement de dev
- [ ] **Test sur un appareil Apple bloqué avant iOS 15** — pas fait, même raison

### 5. Panneau de config
- [x] Tous les contrôles (sliders, swatches palette-projet, sélecteur de forme) branchés et vérifiés fonctionnels
- [x] Presets `localStorage` : nouvelles clés (`parallax`, `shape`, `shapeIntensity`) ajoutées avec fallback `?? DEFAULTS.x` — anciens presets sans ces clés restent chargeables sans migration
- [x] Bouton "Enregistrer" (✓) ajouté à côté de "Supprimer" (×) pour écraser un preset existant avec les réglages courants

### 6. Nettoyage
- [x] Ancien pipeline canvas2D des **orbes** retiré (`drawOrbs` Canvas2D, dégradés radiaux) — remplacé par le rendu WebGL
- [ ] Wrapper `.gradient-bg__inner` **conservé** (parallaxe DOM, cf. §3) — pas de nettoyage à faire ici tant que le choix §3 n'est pas revisité
- [ ] Pipeline grain Canvas2D **conservé** (cf. §1) — à retirer seulement si migré en shader plus tard
