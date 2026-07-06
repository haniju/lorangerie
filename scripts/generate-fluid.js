// ============================================================================
//  scripts/generate-fluid.js
//  Génère src/scss/base/_fluid.scss depuis src/data/tokens.fluid.json.
//  Jumeau « fluide » de generate-tokens.js (couleurs).
//
//  Option C (hybride) — cf. CHANGELOG.md :
//   - fixed.space  -> --space-<n>  en rem fixes (barème px Figma, /root)
//   - fixed.corner -> --corner-<name> en rem fixes
//   - fixed.stroke -> --stroke-<name> en px (les traits restent en px)
//   - fluid.<name> -> clamp(min, intercept + slope·vw, max) calibré min..max viewport
//
//  _fluid.scss est GÉNÉRÉ, ne pas l'éditer à la main (source = Figma).
// ============================================================================

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FLUID_SRC  = resolve(__dirname, '../src/data/tokens.fluid.json')
const FLUID_SCSS = resolve(__dirname, '../src/scss/base/_fluid.scss')

// arrondi propre (évite 0.43750000001rem)
const round = (n, d = 4) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}
const rem = (px, root) => `${round(px / root)}rem`

// clamp(min, intercept + slope·vw, max) entre deux bornes de viewport.
// v = valeur (px) au viewport w ; droite affine v = a·w + b sur [minW, maxW].
function clampFrom({ min, max }, minW, maxW, root) {
  const minRem = px => round(px / root)
  const slopePxPerPx = (max - min) / (maxW - minW)
  const vw = round(slopePxPerPx * 100, 4)          // px de viewport -> vw
  const interceptPx = min - slopePxPerPx * minW
  const interceptRem = round(interceptPx / root)
  // borne basse = plus petite valeur, borne haute = plus grande (ordre clamp)
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return `clamp(${minRem(lo)}rem, ${interceptRem}rem + ${vw}vw, ${minRem(hi)}rem)`
}

export function generateFluidTokens() {
  const data = JSON.parse(readFileSync(FLUID_SRC, 'utf-8'))
  const { min: minW, max: maxW, cap, root } = data.bornes
  const { space, corner, stroke } = data.fixed
  const fluid = data.fluid

  let css = ''
  css += `// ─── FLUIDE — GÉNÉRÉ depuis src/data/tokens.fluid.json ───────\n`
  css += `// NE PAS ÉDITER À LA MAIN. Régénérer : npm run tokens:fluid\n`
  css += `// Option C (hybride) : espacements/corners/strokes fixes + clamp() ${minW}→${maxW}. Cf. CHANGELOG.md\n\n`

  css += `:root {\n`

  // --- Espacements fixes (barème Figma px -> rem) ---
  css += `  /* ── Espacements (barème Figma, rem fixes) ── */\n`
  for (const key of Object.keys(space)) {
    css += `  --space-${key}: ${rem(space[key], root)}; // ${space[key]}px\n`
  }

  // --- Rayons ---
  css += `\n  /* ── Rayons (corners) ── */\n`
  for (const key of Object.keys(corner)) {
    css += `  --corner-${key}: ${rem(corner[key], root)}; // ${corner[key]}px\n`
  }

  // --- Traits (px) ---
  css += `\n  /* ── Épaisseurs de trait (px) ── */\n`
  for (const key of Object.keys(stroke)) {
    css += `  --stroke-${key}: ${stroke[key]}px;\n`
  }

  // --- Cadre / contenu ---
  css += `\n  /* ── Cadre ── */\n`
  css += `  --content-cap: ${rem(cap, root)}; // ${cap}px, contenu plafonné\n`

  // --- Fluide (clamp) ---
  css += `\n  /* ── Fluide : quantités à 2 bornes (clamp ${minW}→${maxW}) ── */\n`
  for (const [name, pair] of Object.entries(fluid)) {
    css += `  --${name}: ${clampFrom(pair, minW, maxW, root)}; // ${pair.min}→${pair.max}px\n`
  }

  css += `}\n`

  writeFileSync(FLUID_SCSS, css, 'utf-8')
  return {
    space: Object.keys(space).length,
    corner: Object.keys(corner).length,
    stroke: Object.keys(stroke).length,
    fluid: Object.keys(fluid).length,
  }
}

if (process.argv[1] && process.argv[1].includes('generate-fluid')) {
  const r = generateFluidTokens()
  console.log(
    `_fluid.scss généré : ${r.space} espacements, ${r.corner} rayons, ${r.stroke} traits, ${r.fluid} tokens fluides.`
  )
}
