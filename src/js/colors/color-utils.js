// ─── Color Utilities ────────────────────────────────────────

/**
 * Convert HSL values to HEX string.
 * @param {number} h - Hue (0–360)
 * @param {number} s - Saturation (0–100)
 * @param {number} l - Lightness (0–100)
 * @returns {string} HEX color string (e.g. "#ff692f")
 */
export function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Convert HEX string to HSL values.
 * @param {string} hex - HEX color string (e.g. "#ff692f")
 * @returns {{ h: number, s: number, l: number }}
 */
export function hexToHsl(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 0 }

  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

/**
 * Generate a CSS variable name from a display name.
 * "Bg Light" → "color-bg-light"
 * @param {string} name
 * @returns {string}
 */
export function nameToVariable(name) {
  return 'color-' + name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Generate a slug ID from a display name.
 * "Bg Light" → "bg-light"
 * @param {string} name
 * @returns {string}
 */
export function nameToId(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Determine if text on a given background should be light or dark.
 * @param {number} lightness - HSL lightness value (0–100)
 * @returns {boolean} true if text should be dark
 */
export function shouldUseDarkText(lightness) {
  return lightness > 55
}

/**
 * Generate a unique ID by appending a counter if needed.
 * @param {string} baseId
 * @param {string[]} existingIds
 * @returns {string}
 */
export function uniqueId(baseId, existingIds) {
  if (!existingIds.includes(baseId)) return baseId
  let i = 2
  while (existingIds.includes(`${baseId}-${i}`)) i++
  return `${baseId}-${i}`
}
