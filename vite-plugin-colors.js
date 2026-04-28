import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { generateColorTokens } from './scripts/generate-tokens.js'

const COLORS_PATH = resolve(process.cwd(), 'src/data/colors.json')

export default function colorsPlugin() {
  return {
    name: 'vite-plugin-colors',

    configureServer(server) {
      server.middlewares.use('/__api/colors', (req, res) => {
        // CORS headers for dev
        res.setHeader('Content-Type', 'application/json')

        if (req.method === 'GET') {
          try {
            const data = readFileSync(COLORS_PATH, 'utf-8')
            res.end(data)
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)

              // Read current data for rename/delete detection
              let previousData = null
              try {
                previousData = JSON.parse(readFileSync(COLORS_PATH, 'utf-8'))
              } catch { /* first write */ }

              // Write the new colors.json
              writeFileSync(COLORS_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf-8')

              // Regenerate SCSS tokens
              generateColorTokens()

              // Detect renamed variables and propagate
              if (previousData) {
                const renames = detectRenames(previousData, payload)
                if (renames.length > 0) {
                  propagateRenames(renames)
                }
              }

              res.end(JSON.stringify({ success: true }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // Endpoint to check variable usage before deletion
      server.middlewares.use('/__api/colors/check-usage', (req, res) => {
        res.setHeader('Content-Type', 'application/json')

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { variable } = JSON.parse(body)
            const usages = findVariableUsages(variable)
            res.end(JSON.stringify({ variable, usages }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // Endpoint to replace a variable in all SCSS files
      server.middlewares.use('/__api/colors/replace-variable', (req, res) => {
        res.setHeader('Content-Type', 'application/json')

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { oldVariable, newVariable } = JSON.parse(body)
            const count = replaceInScssFiles(oldVariable, newVariable)
            res.end(JSON.stringify({ success: true, replacements: count }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    }
  }
}

/**
 * Detect renamed variables between old and new data.
 */
function detectRenames(oldData, newData) {
  const renames = []
  for (const newTint of newData.tints) {
    const oldTint = oldData.tints.find(t => t.id === newTint.id)
    if (oldTint && oldTint.variable !== newTint.variable) {
      renames.push({ from: oldTint.variable, to: newTint.variable })
    }
  }
  return renames
}

/**
 * Propagate variable renames across all SCSS files.
 */
function propagateRenames(renames) {
  const scssDir = resolve(process.cwd(), 'src/scss')
  const files = getAllScssFiles(scssDir)

  for (const file of files) {
    // Skip the tokens file — it's regenerated
    if (file.endsWith('_tokens.scss')) continue

    let content = readFileSync(file, 'utf-8')
    let changed = false

    for (const { from, to } of renames) {
      const pattern = new RegExp(`var\\(--${escapeRegex(from)}\\)`, 'g')
      const replacement = `var(--${to})`
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement)
        changed = true
      }
    }

    if (changed) {
      writeFileSync(file, content, 'utf-8')
    }
  }
}

/**
 * Find all SCSS files that reference a given variable.
 */
function findVariableUsages(variable) {
  const scssDir = resolve(process.cwd(), 'src/scss')
  const files = getAllScssFiles(scssDir)
  const usages = []

  for (const file of files) {
    if (file.endsWith('_tokens.scss')) continue
    const content = readFileSync(file, 'utf-8')
    if (content.includes(`--${variable}`)) {
      usages.push(file.replace(process.cwd() + '/', ''))
    }
  }

  return usages
}

/**
 * Replace all occurrences of a variable in SCSS files.
 */
function replaceInScssFiles(oldVariable, newVariable) {
  const scssDir = resolve(process.cwd(), 'src/scss')
  const files = getAllScssFiles(scssDir)
  let count = 0

  for (const file of files) {
    if (file.endsWith('_tokens.scss')) continue
    let content = readFileSync(file, 'utf-8')
    const pattern = new RegExp(`var\\(--${escapeRegex(oldVariable)}\\)`, 'g')
    const matches = content.match(pattern)
    if (matches) {
      content = content.replace(pattern, `var(--${newVariable})`)
      writeFileSync(file, content, 'utf-8')
      count += matches.length
    }
  }

  return count
}

/**
 * Recursively get all .scss files in a directory.
 */
function getAllScssFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllScssFiles(fullPath))
    } else if (entry.name.endsWith('.scss')) {
      files.push(fullPath)
    }
  }

  return files
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
