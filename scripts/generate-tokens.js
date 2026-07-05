// ============================================================================
//  scripts/generate-tokens.js
//  Génère src/scss/base/_tokens.scss depuis colors.json (Option B).
//
//  - PRIMITIVES (_base, sans `ref`)  -> --nom: #hex;
//  - TOKENS     (tokens, avec `ref`) -> --nom: var(--primitive);  (référence)
//  - l'arborescence est reflétée par des commentaires par niveau
//  - les primitives sont déclarées AVANT les tokens (ordre requis en CSS)
// ============================================================================

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COLORS_PATH = resolve(__dirname, '../src/data/colors.json')
const TOKENS_PATH = resolve(__dirname, '../src/scss/base/_tokens.scss')

const START_MARKER = '/* COLORS:START */'
const END_MARKER = '/* COLORS:END */'

// Rend un ensemble de tints, en insérant un commentaire quand le chemin
// intermédiaire (tout sauf le dernier segment) change → reflète l'arbo.
function renderTints(tints, asRef) {
  let css = ''
  let lastParent = null
  for (const t of tints) {
    const parts = (t.path || t.variable).split('/')   // séparateur = slash uniquement
    const parent = parts.slice(0, -1).join(' / ')
    if (parent && parent !== lastParent) {
      css += `  // ${parent}\n`
      lastParent = parent
    }
    const value = asRef && t.ref ? `var(--${t.ref})` : t.hex
    css += `  --${t.variable}: ${value};\n`
  }
  return css
}

export function generateColorTokens() {
  const data = JSON.parse(readFileSync(COLORS_PATH, 'utf-8'))
  const tokens = readFileSync(TOKENS_PATH, 'utf-8')

  const startIdx = tokens.indexOf(START_MARKER)
  const endIdx = tokens.indexOf(END_MARKER)
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Marqueurs COLORS introuvables dans _tokens.scss')
  }

  // Séparation primitives / tokens sémantiques
  const primitives = data.tints.filter(t => !t.ref)
  const semantic   = data.tints.filter(t => t.ref)

  // Tri par groupe (ordre) puis par ordre d'apparition
  const groupOrder = new Map(data.groups.map(g => [g.id, g.order]))
  const byGroupThenOrder = (a, b) =>
    (groupOrder.get(a.groupId) ?? 999) - (groupOrder.get(b.groupId) ?? 999) || a.order - b.order
  primitives.sort(byGroupThenOrder)
  semantic.sort(byGroupThenOrder)

  let css = `${START_MARKER}\n\n:root {\n`

  // --- PRIMITIVES (valeurs) ---
  css += `  /* ── Primitives (_base) ── */\n`
  let lastGroup = null
  for (const g of data.groups) {
    const tints = primitives.filter(t => t.groupId === g.id)
    if (!tints.length) continue
    css += `\n  // ${g.name}\n`
    for (const t of tints) css += `  --${t.variable}: ${t.hex};\n`
  }

  // --- TOKENS SÉMANTIQUES (références) ---
  css += `\n  /* ── Tokens (références symboliques) ── */\n`
  for (const g of data.groups) {
    const tints = semantic.filter(t => t.groupId === g.id)
    if (!tints.length) continue
    css += `\n  // ${g.name}\n`
    css += renderTints(tints, true)
  }

  css += `}\n\n${END_MARKER}`

  const newTokens = tokens.substring(0, startIdx) + css + tokens.substring(endIdx + END_MARKER.length)
  writeFileSync(TOKENS_PATH, newTokens, 'utf-8')
  return { success: true, primitives: primitives.length, tokens: semantic.length }
}

if (process.argv[1] && process.argv[1].includes('generate-tokens')) {
  const r = generateColorTokens()
  console.log(`_tokens.scss généré : ${r.primitives} primitives, ${r.tokens} tokens.`)
}
