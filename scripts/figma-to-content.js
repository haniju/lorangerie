// ============================================================================
//  scripts/figma-to-content.js
//  Transforme l'export Figma (tokens.textes.json, DTCG brut) en textes.json
//  consommable par les composants, en unifiant l'écriture inclusive.
//  Jumeau « contenu » de figma-to-colors.js. Cf. PLAN-ACTION.md / INCLUSIVE-WRITING.md.
//
//  - flatten des nœuds DTCG { $type, $value } -> valeur brute (string/array/boolean)
//  - détection fine des 3 modalités d'écriture inclusive (point médian / point / tiret)
//    et unification vers le point médian `·` (U+00B7)
//  - forme orale résolue via le lexique validé (src/data/inclusive-lexicon.json) ;
//    tout token inconnu du lexique est marqué "à-valider" dans le rapport, PAS deviné
//  - rapport avant/après (src/data/inclusive-report.json) = artefact de validation humaine
//
//  textes.json n'est PLUS édité à la main : généré depuis tokens.textes.json.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIGMA_EXPORT = resolve(__dirname, '../src/data/tokens.textes.json')
const TEXTES_PATH  = resolve(__dirname, '../src/data/textes.json')
const REPORT_PATH  = resolve(__dirname, '../src/data/inclusive-report.json')
const LEXICON_PATH = resolve(__dirname, '../src/data/inclusive-lexicon.json')

// Formes déjà tranchées dans INCLUSIVE-WRITING.md §3 (table "forme orale").
// Sert uniquement à amorcer le lexique s'il n'existe pas encore — ne réécrit
// jamais un lexique déjà présent (fichier curé à la main, versionné).
const SEED_LEXICON = {
  'adhérent·e·s': 'adhérentes et adhérents',
  'habitant·e·s': 'habitantes et habitants',
  'humain·es': 'humaines et humains',
}

// Suffixes de genre inclusifs (liste blanche), du plus long au plus court —
// sinon "es" matcherait comme "e" et tronquerait le motif.
const SUFFIXES = [
  'euses', 'ères', 'trices', 'rices', 'ales', 'ives', 'ses',
  'ère', 'euse', 'trice', 'rice', 'ale', 'ive', 'ne', 'nes',
  'le', 'les', 've', 'es', 'se', 'e', 's', 'f',
].sort((a, b) => b.length - a.length)

const SEP = '[·.-]'
const INCLUSIVE_RE = new RegExp(
  `\\p{L}+(?:${SEP})(?:${SUFFIXES.join('|')})(?:(?:${SEP})(?:s|es))?`,
  'gu'
)

// Filet de sécurité documenté (INCLUSIVE-WRITING.md §2) : motifs qui pourraient
// matcher la regex mais ne sont jamais de l'inclusif. Non exercé par le contenu
// actuel (les suffixes ne matchent pas ces mots), conservé par prudence.
const FALSE_POSITIVES = [
  'tiers-lieu', 'open-space', 'rez-de-chaussée', 'week-end',
  'suis-je', 'est-ce', 'peut-on', 'contacte-nous', 'rejoins-nous', 'vas-y',
]

function modaliteOf(sep) {
  if (sep === '·') return 'point-médian'
  if (sep === '.') return 'point'
  return 'tiret'
}

// Découpe un motif détecté en segments (radical, sép. genre, suffixe genre,
// sép. pluriel?, suffixe pluriel?) pour reconstruire la forme unifiée.
function splitMatch(match) {
  const parts = match.split(/([·.-])/)
  return parts
}

function unify(match) {
  const segments = splitMatch(match)
  // segments = [radical, sep1, suffixeGenre, sep2?, suffixePluriel?]
  const radical = segments[0]
  const sep1 = segments[1]
  const genre = segments[2]
  const sep2 = segments[3]
  const pluriel = segments[4]
  const modalite = modaliteOf(sep1)
  const converti = sep2
    ? `${radical}·${genre}·${pluriel}`
    : `${radical}·${genre}`
  return { modalite, converti }
}

function detectInclusive(text, cle, lexicon, report) {
  if (typeof text !== 'string') return text
  return text.replace(INCLUSIVE_RE, (match) => {
    if (FALSE_POSITIVES.includes(match.toLowerCase())) {
      report.push({ cle, brut: match, modalite: 'faux-positif', converti: match, orale: null, statut: 'faux-positif-ignoré' })
      return match
    }
    const { modalite, converti } = unify(match)
    const orale = lexicon[converti] || null
    report.push({
      cle,
      brut: match,
      modalite,
      converti,
      orale,
      statut: orale ? 'auto' : 'à-valider',
    })
    return converti
  })
}

// Aplatit récursivement un nœud DTCG { $scopes, $type, $value } -> valeur nue.
// Un groupe est un objet SANS `$value` ; une feuille en a un.
function flatten(node, path, lexicon, report) {
  if (node && typeof node === 'object' && '$value' in node) {
    const value = node.$value
    if (Array.isArray(value)) {
      return value.map((v, i) => detectInclusive(v, `${path}[${i}]`, lexicon, report))
    }
    if (typeof value === 'string') {
      return detectInclusive(value, path, lexicon, report)
    }
    return value // boolean, number...
  }
  const out = {}
  for (const key in node) {
    out[key] = flatten(node[key], path ? `${path}.${key}` : key, lexicon, report)
  }
  return out
}

export function figmaToContent() {
  const figma = JSON.parse(readFileSync(FIGMA_EXPORT, 'utf-8'))
  const mode1 = figma[0].textes.modes['Mode 1']

  const lexicon = existsSync(LEXICON_PATH)
    ? JSON.parse(readFileSync(LEXICON_PATH, 'utf-8'))
    : {}
  for (const [k, v] of Object.entries(SEED_LEXICON)) {
    if (!(k in lexicon)) lexicon[k] = v
  }

  const report = []
  const content = flatten(mode1, '', lexicon, report)

  writeFileSync(TEXTES_PATH, JSON.stringify(content, null, 2) + '\n', 'utf-8')
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf-8')
  if (!existsSync(LEXICON_PATH)) {
    writeFileSync(LEXICON_PATH, JSON.stringify(lexicon, null, 2) + '\n', 'utf-8')
  }

  return { content, report, lexicon }
}

if (process.argv[1] && process.argv[1].includes('figma-to-content')) {
  const { report } = figmaToContent()
  const aValider = report.filter(r => r.statut === 'à-valider').length
  console.log(
    `textes.json régénéré depuis Figma. ${report.length} occurrence(s) inclusive(s) détectée(s), ${aValider} à valider (cf. inclusive-report.json).`
  )
}
