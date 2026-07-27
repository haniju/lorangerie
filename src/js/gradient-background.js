// Fond animé "orbes" — version prod, config figée (issue du panneau de
// réglages qui reste exclusivement sur la branche feature/gradient-background).
// Moteur de rendu identique (webgl-orbs.js, orbes + grain procédural en
// shader unique), pas d'UI de configuration ici.

import BASE_CFG from '../data/gradient-background.json'
import { createOrbRenderer, ORB_COUNT } from './webgl-orbs.js'

// Résolution du framebuffer WebGL cappée indépendamment du devicePixelRatio
// réel — le coût d'un shader plein écran scale avec le nombre de pixels,
// pas avec la complexité de la scène (cf. WEBGL-BACKGROUND-PLAN.md).
const WEBGL_RESOLUTION_SCALE = 1

// La surface sur laquelle évoluent les orbes fait 1.5x le viewport (dans les
// deux axes), centrée sur l'écran — jamais indexée sur la hauteur de la
// page. Les orbes entrent/sortent du cadre visible via leur propre
// mouvement (sin/cos, cf. ORB_BASE plus bas), sans jamais exposer de bord
// vide (cf. bug : sur une page longue, le rayon des orbes — normalisé par
// max(largeur, hauteur) du canvas — explosait avec la hauteur totale
// scrollable, donnant un rendu différent par page).
const SURFACE_SCALE = 1.5

// BASE_CFG vient de src/data/gradient-background.json — même fichier que
// celui utilisé par le panneau de réglages sur feature/gradient-background
// (comme valeurs de départ / bouton "Réinitialiser"). Éditer ce fichier
// (sur cette branche, avec les valeurs voulues pour la prod) suffit à faire
// évoluer le preset figé, plus besoin de coller le JSON exporté à la main.

// Même seuil que $bp-desktop dans src/scss/base/_breakpoints.scss (56rem =
// 896px à 16px/rem) — seuil unique du site, dupliqué ici faute de constante
// JS partagée.
const MOBILE_BREAKPOINT = 896

// Ajustement mobile du parallaxe (le rayon mobile vient de BASE_CFG.radiusMobile).
// NB : plus `parallax` est bas, plus le fond "traîne" derrière le scroll —
// 0 = fond figé (effet maximal), 1 = fond synchronisé au contenu (~pas
// d'effet). Le preset desktop est à 0.9 (quasi synchronisé) ; on descend
// nettement sur mobile pour un décalage bien visible.
const MOBILE_PARALLAX = 0.4

// Le JSON stocke les couleurs en HEX (lisible, traçable vers les tokens
// Figma) ; le renderer WebGL attend des triplets RGB 0-255 (uniformes
// numériques — un `var()` CSS ne serait de toute façon pas résolvable côté
// shader).
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const ORB_BASE = [
  { px: 0.5, py: 0.4, ax: 0.38, ay: 0.28, fx: 0.00017, fy: 0.00013, r: 0.62, ci: 0, p: 0.0 },
  { px: 0.3, py: 0.65, ax: 0.28, ay: 0.32, fx: 0.00012, fy: 0.00018, r: 0.56, ci: 1, p: 1.4 },
  { px: 0.75, py: 0.3, ax: 0.35, ay: 0.26, fx: 0.00015, fy: 0.00011, r: 0.58, ci: 2, p: 2.7 },
  { px: 0.2, py: 0.5, ax: 0.25, ay: 0.35, fx: 0.0001, fy: 0.00016, r: 0.52, ci: 3, p: 4.1 },
  { px: 0.65, py: 0.7, ax: 0.32, ay: 0.3, fx: 0.00019, fy: 0.00014, r: 0.5, ci: 4, p: 5.5 },
  { px: 0.45, py: 0.2, ax: 0.3, ay: 0.27, fx: 0.00014, fy: 0.0002, r: 0.48, ci: 5, p: 3.2 },
  { px: 0.85, py: 0.55, ax: 0.22, ay: 0.3, fx: 0.00016, fy: 0.00012, r: 0.45, ci: 0, p: 6.8 },
  { px: 0.15, py: 0.25, ax: 0.3, ay: 0.22, fx: 0.00013, fy: 0.00019, r: 0.42, ci: 1, p: 7.9 },
  { px: 0.55, py: 0.85, ax: 0.26, ay: 0.24, fx: 0.00018, fy: 0.00015, r: 0.4, ci: 2, p: 9.1 },
  { px: 0.35, py: 0.1, ax: 0.24, ay: 0.28, fx: 0.00011, fy: 0.00017, r: 0.38, ci: 3, p: 10.3 },
  { px: 0.9, py: 0.15, ax: 0.2, ay: 0.25, fx: 0.00019, fy: 0.00013, r: 0.36, ci: 4, p: 11.5 },
  { px: 0.05, py: 0.8, ax: 0.28, ay: 0.2, fx: 0.00014, fy: 0.0002, r: 0.44, ci: 5, p: 12.7 },
  { px: 0.6, py: 0.05, ax: 0.22, ay: 0.26, fx: 0.00017, fy: 0.00011, r: 0.34, ci: 0, p: 13.9 },
]

export function initGradientBackground(canvasRoot) {
  // Nombre d'orbes réglable par page (cf. "pages" dans gradient-background.json)
  // — la clé vient de data-page, posée par GradientBackground.astro depuis
  // Astro.url.pathname.
  const pageKey = canvasRoot.dataset.page || 'index'
  const pageCfg = BASE_CFG.pages?.[pageKey]

  // Couleurs des orbes tirées au hasard parmi les presets définis dans le
  // JSON, une fois par chargement de page (pas par frame ni par resize).
  const preset = BASE_CFG.presets[Math.floor(Math.random() * BASE_CFG.presets.length)]

  const cfg = {
    ...BASE_CFG,
    baseColor: hexToRgb(BASE_CFG.baseColor),
    colors: Array.from({ length: ORB_COUNT }, (_, i) => hexToRgb(preset[i % preset.length])),
    grainTint: hexToRgb(BASE_CFG.grainTint),
  }

  function resolveOrbCount(isMobile) {
    if (isMobile) return pageCfg?.orbCountMobile ?? BASE_CFG.orbCountMobile ?? BASE_CFG.orbCount
    return pageCfg?.orbCount ?? BASE_CFG.orbCount
  }

  const inner = canvasRoot.querySelector('.gradient-bg__inner')
  const canvas = canvasRoot.querySelector('.gradient-bg__canvas')
  const mainEl = document.querySelector('main')

  // Rendu orbes en WebGL1 ; si indisponible (pas de support, contexte
  // logiciel type SwiftShader/llvmpipe) → fallback couleur CSS statique,
  // pas de retour au Canvas2D animé (cf. WEBGL-BACKGROUND-PLAN.md).
  let orbRenderer = null
  try {
    orbRenderer = createOrbRenderer(canvas, ORB_BASE)
  } catch (err) {
    console.error('[gradient-background] WebGL init failed', err)
    orbRenderer = null
  }

  function applyStaticFallback() {
    canvas.style.display = orbRenderer ? '' : 'none'
    const [br, bg, bb] = cfg.baseColor
    inner.style.backgroundColor = `rgb(${br},${bg},${bb})`
  }

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault()
    orbRenderer = null
    applyStaticFallback()
  })
  canvas.addEventListener('webglcontextrestored', () => {
    try {
      orbRenderer = createOrbRenderer(canvas, ORB_BASE)
    } catch (err) {
      console.error('[gradient-background] WebGL re-init failed', err)
      orbRenderer = null
    }
    applyStaticFallback()
    resize()
  })

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let W, H
  let marginX = 0
  let marginY = 0

  // Parallaxe pilotée à la main plutôt que via GSAP/ScrollTrigger : ici le
  // trigger et le scroller sont le même élément (`main` défile sur
  // lui-même), un cas dégénéré que ScrollTrigger ne mesure pas correctement
  // (start/end calculés par rapport à l'élément lui-même) — le tween ne se
  // déclenchait jamais. Un listener de scroll direct est plus simple et
  // fiable pour ce cas précis.
  //
  // La course est bornée par la marge disponible (marginY, cf. resize()) —
  // jamais par la hauteur de page — donc jamais de bord vide exposé, quelle
  // que soit la longueur du contenu.
  function updateParallax() {
    if (reduceMotion) return
    const maxScroll = mainEl.scrollHeight - mainEl.clientHeight
    const progress = maxScroll > 0 ? mainEl.scrollTop / maxScroll : 0
    const travel = marginY * (1 - cfg.parallax)
    inner.style.transform = `translateY(${-progress * travel}px)`
  }

  let parallaxTicking = false
  mainEl.addEventListener('scroll', () => {
    if (parallaxTicking) return
    parallaxTicking = true
    requestAnimationFrame(() => {
      updateParallax()
      parallaxTicking = false
    })
  })

  function resize() {
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    const isMobile = viewportW < MOBILE_BREAKPOINT
    cfg.radius = isMobile ? BASE_CFG.radiusMobile ?? BASE_CFG.radius : BASE_CFG.radius
    cfg.orbAlpha = isMobile ? BASE_CFG.orbAlphaMobile ?? BASE_CFG.orbAlpha : BASE_CFG.orbAlpha
    cfg.parallax = isMobile ? MOBILE_PARALLAX : BASE_CFG.parallax
    cfg.orbCount = resolveOrbCount(isMobile)

    W = Math.round(viewportW * SURFACE_SCALE)
    H = Math.round(viewportH * SURFACE_SCALE)
    marginX = (W - viewportW) / 2
    marginY = (H - viewportH) / 2

    inner.style.width = `${W}px`
    inner.style.height = `${H}px`
    inner.style.left = `${-marginX}px`
    inner.style.top = `${-marginY}px`

    if (orbRenderer) {
      canvas.width = Math.round(W * WEBGL_RESOLUTION_SCALE)
      canvas.height = Math.round(H * WEBGL_RESOLUTION_SCALE)
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      orbRenderer.resize(canvas.width, canvas.height)
    }
    applyStaticFallback()

    updateParallax()
  }

  // Grain procédural (fragment shader, cf. webgl-orbs.js) : le seed ne
  // change qu'à la cadence `grainFreq`, pour le même effet de scintillement
  // discret que l'ancien pipeline Canvas2D à frames pré-calculées — sans le
  // coût CPU de `getImageData`/`putImageData` (cf. WEBGL-BACKGROUND-PLAN.md
  // §1, cause de la saccade au scroll corrigée le 22/07).
  let grainSeed = 0

  function drawOrbs(tSeconds) {
    if (!orbRenderer) return
    // Le wrap du temps (précision mediump côté shader) est géré en interne
    // par le renderer, avec recalage de phase pour rester raccord — cf.
    // webgl-orbs.js. On lui passe donc le temps continu, non wrappé.
    orbRenderer.render(cfg, tSeconds, grainSeed)
  }

  let rafId = null

  function draw(ts) {
    if (Math.round(ts / 16) % cfg.grainFreq === 0) grainSeed++
    drawOrbs((ts / 1000) * cfg.speed)
    rafId = requestAnimationFrame(draw)
  }

  document.addEventListener('visibilitychange', () => {
    if (reduceMotion) return
    if (document.hidden) {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
    } else if (rafId === null) {
      rafId = requestAnimationFrame(draw)
    }
  })

  window.addEventListener('resize', resize)
  window.addEventListener('load', resize)
  resize()

  if (reduceMotion) {
    drawOrbs(0)
  } else {
    rafId = requestAnimationFrame(draw)
  }
}
