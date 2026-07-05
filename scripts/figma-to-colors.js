// ============================================================================
//  scripts/figma-to-colors.js
//  Transforme l'export Figma (tokens.colors.json) — structure PROFONDE (tree)
//  vers colors.json, en préservant TOUTE la hiérarchie dans le nom des tokens.
//
//  - strip du préfixe "color/"
//  - désaccentuation des noms techniques (pêche -> peche)
//  - nom = chemin complet aplati en tirets (profondeur préservée)
//  - les tokens conservent leur `alias` (référence symbolique) + `value`
//
//  colors.json n'est PLUS édité à la main : généré depuis Figma.
// ============================================================================

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { generateColorTokens } from './generate-tokens.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIGMA_EXPORT = resolve(__dirname, '../src/data/tokens.colors.json')
const COLORS_PATH  = resolve(__dirname, '../src/data/colors.json')

// "color/action/button-primary/texte/hover" -> "action-button-primary-texte-hover"
// strip "color/" en tête, désaccentue, remplace / et espaces par des tirets.
export function toVar(name) {
  return name
    .replace(/^color\//, '')                 // strip du préfixe
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // désaccentuation (ê -> e)
    .replace(/[/\s]+/g, '-')                  // / et espaces -> tirets
    .replace(/[^a-z0-9-]/gi, '')              // ASCII sûr
    .toLowerCase()
}

// groupe = 1er segment après strip de "color/"  (sable, citron, action, text…)
function groupOf(name) {
  return name.replace(/^color\//, '').split('/')[0]
}

// Aplatit récursivement un arbre {segment: nœud|feuille}.
// Une feuille est reconnaissable à sa propriété `value` (string hex).
function walk(node, out) {
  for (const key in node) {
    const child = node[key]
    if (child && typeof child === 'object' && typeof child.value === 'string') {
      out.push(child)            // feuille = descripteur de variable
    } else if (child && typeof child === 'object') {
      walk(child, out)           // groupe = on descend
    }
  }
}

export function figmaToColors() {
  const figma = JSON.parse(readFileSync(FIGMA_EXPORT, 'utf-8'))
  const collections = figma.collections || {}

  const groupOrder = []
  const groupMap = new Map()
  const tints = []
  let order = 0

  // On parcourt les collections dans l'ordre (_base d'abord si présent),
  // puis chaque arbre en profondeur.
  const names = Object.keys(collections).sort((a, b) => (a === '_base' ? -1 : b === '_base' ? 1 : 0))

  for (const cname of names) {
    const col = collections[cname]
    if (!col || !col.tree) continue
    const leaves = []
    walk(col.tree, leaves)

    for (const leaf of leaves) {
      if (!leaf.value) continue
      const g = groupOf(leaf.name)
      if (!groupMap.has(g)) {
        groupMap.set(g, { id: g, name: g, order: groupOrder.length })
        groupOrder.push(g)
      }
      tints.push({
        id: leaf.id || leaf.name,          // id Figma stable (propagation)
        variable: toVar(leaf.name),         // chemin complet -> --action-button-primary-initial
        path: leaf.name.replace(/^color\//, ''), // chemin d'origine (pour refléter l'arbo)
        hex: leaf.value,                    // valeur résolue
        groupId: g,
        order: order++,
        collection: leaf.collection || cname,
        // référence symbolique : la primitive visée, en nom de custom property
        ref: leaf.alias ? toVar(leaf.alias) : null,
        alias: leaf.alias || null           // nom Figma d'origine (info)
      })
    }
  }

  const out = {
    groups: groupOrder.map(g => groupMap.get(g)),
    tints,
    _source: 'figma',
    _generatedAt: new Date().toISOString()
  }

  writeFileSync(COLORS_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  return out
}

if (process.argv[1] && process.argv[1].includes('figma-to-colors')) {
  figmaToColors()
  generateColorTokens()
  console.log('colors.json régénéré depuis Figma (structure profonde), _tokens.scss mis à jour.')
}
