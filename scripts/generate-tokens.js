import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COLORS_PATH = resolve(__dirname, '../src/data/colors.json')
const TOKENS_PATH = resolve(__dirname, '../src/scss/base/_tokens.scss')

const START_MARKER = '/* COLORS:START */'
const END_MARKER = '/* COLORS:END */'

export function generateColorTokens() {
  const data = JSON.parse(readFileSync(COLORS_PATH, 'utf-8'))
  const tokens = readFileSync(TOKENS_PATH, 'utf-8')

  const startIdx = tokens.indexOf(START_MARKER)
  const endIdx = tokens.indexOf(END_MARKER)

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Color markers not found in _tokens.scss')
  }

  // Sort groups by order
  const groups = [...data.groups].sort((a, b) => a.order - b.order)

  // Build CSS custom properties grouped by group
  let css = `${START_MARKER}\n\n:root {\n`

  for (const group of groups) {
    const tints = data.tints
      .filter(t => t.groupId === group.id)
      .sort((a, b) => a.order - b.order)

    if (tints.length === 0) continue

    css += `  // ${group.name}\n`
    for (const tint of tints) {
      css += `  --${tint.variable}: ${tint.hex};\n`
    }
    css += '\n'
  }

  // Ungrouped tints
  const ungrouped = data.tints
    .filter(t => !t.groupId)
    .sort((a, b) => a.order - b.order)

  if (ungrouped.length > 0) {
    css += `  // Sans groupe\n`
    for (const tint of ungrouped) {
      css += `  --${tint.variable}: ${tint.hex};\n`
    }
    css += '\n'
  }

  css += `}\n\n${END_MARKER}`

  const newTokens = tokens.substring(0, startIdx) + css + tokens.substring(endIdx + END_MARKER.length)
  writeFileSync(TOKENS_PATH, newTokens, 'utf-8')

  return { success: true }
}

// Run directly if called as script
if (process.argv[1] && process.argv[1].includes('generate-tokens')) {
  generateColorTokens()
  console.log('Color tokens generated successfully.')
}
