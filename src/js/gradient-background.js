// Fond animé "orbes" — porté depuis le prototype orangerie-gradient-canvas.html
// (canvas 2D : orbes en dégradé radial + grain), avec un panneau de réglages
// flottant, replié par défaut, ouvert via le bouton nav (voir Navbar.astro).

import colorsData from '../data/colors.json'

// Couleurs des orbes choisies parmi les primitives de marque (Figma-first,
// _base uniquement — pas les alias sémantiques action/text/light/background).
const PALETTE_FAMILIES = ['sable', 'citron', 'peche', 'sapin', 'citrouille']
const PALETTE = colorsData.tints.filter(
  t => t.collection === '_base' && PALETTE_FAMILIES.includes(t.groupId)
)

const DEFAULTS = {
  baseColor: [244, 239, 230],
  colors: [
    [242, 196, 178],
    [200, 220, 202],
    [218, 208, 238],
    [248, 230, 165],
    [208, 228, 236],
    [240, 210, 192],
  ],
  speed: 1,
  amplitude: 1,
  radius: 1,
  grainOpacity: 0.05,
  grainScale: 1,
  grainFreq: 3,
  grainTint: [128, 128, 128],
  grainTintMix: 0,
  orbAlpha: 0.82,
  veil: 0.22,
}

const ORB_BASE = [
  { px: 0.5, py: 0.4, ax: 0.38, ay: 0.28, fx: 0.00017, fy: 0.00013, r: 0.62, ci: 0, p: 0.0 },
  { px: 0.3, py: 0.65, ax: 0.28, ay: 0.32, fx: 0.00012, fy: 0.00018, r: 0.56, ci: 1, p: 1.4 },
  { px: 0.75, py: 0.3, ax: 0.35, ay: 0.26, fx: 0.00015, fy: 0.00011, r: 0.58, ci: 2, p: 2.7 },
  { px: 0.2, py: 0.5, ax: 0.25, ay: 0.35, fx: 0.0001, fy: 0.00016, r: 0.52, ci: 3, p: 4.1 },
  { px: 0.65, py: 0.7, ax: 0.32, ay: 0.3, fx: 0.00019, fy: 0.00014, r: 0.5, ci: 4, p: 5.5 },
  { px: 0.45, py: 0.2, ax: 0.3, ay: 0.27, fx: 0.00014, fy: 0.0002, r: 0.48, ci: 5, p: 3.2 },
]

const STORAGE_KEY = 'orangerie-gradient-presets'
const GRAIN_FRAMES = 5

export function initGradientBackground(canvasRoot, uiRoot) {
  const canvas = canvasRoot.querySelector('.gradient-bg__canvas')
  const grainCanvas = canvasRoot.querySelector('.gradient-bg__grain')
  const ctx = canvas.getContext('2d')
  const grainCtx = grainCanvas.getContext('2d')

  const cfg = {
    baseColor: [...DEFAULTS.baseColor],
    colors: DEFAULTS.colors.map(c => [...c]),
    speed: DEFAULTS.speed,
    amplitude: DEFAULTS.amplitude,
    radius: DEFAULTS.radius,
    grainOpacity: DEFAULTS.grainOpacity,
    grainScale: DEFAULTS.grainScale,
    grainFreq: DEFAULTS.grainFreq,
    grainTint: [...DEFAULTS.grainTint],
    grainTintMix: DEFAULTS.grainTintMix,
    orbAlpha: DEFAULTS.orbAlpha,
    veil: DEFAULTS.veil,
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let W, H, dpr
  const grainCache = []
  let grainIdx = 0
  let lastGrainScale = 1
  let lastGrainTint = [128, 128, 128]
  let lastGrainTintMix = 0

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = window.innerWidth
    H = window.innerHeight

    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    grainCanvas.width = W * dpr
    grainCanvas.height = H * dpr
    grainCanvas.style.width = W + 'px'
    grainCanvas.style.height = H + 'px'

    buildGrain()
  }

  function buildGrain() {
    grainCache.length = 0
    const s = cfg.grainScale
    const pw = Math.ceil((W * dpr) / s)
    const ph = Math.ceil((H * dpr) / s)
    const [tr, tg, tb] = cfg.grainTint
    const mix = cfg.grainTintMix

    const offscreen = document.createElement('canvas')
    offscreen.width = pw
    offscreen.height = ph
    const offCtx = offscreen.getContext('2d')

    const frames = reduceMotion ? 1 : GRAIN_FRAMES
    for (let f = 0; f < frames; f++) {
      const id = offCtx.createImageData(pw, ph)
      const d = id.data
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0
        d[i] = Math.round(v * (1 - mix) + tr * mix)
        d[i + 1] = Math.round(v * (1 - mix) + tg * mix)
        d[i + 2] = Math.round(v * (1 - mix) + tb * mix)
        d[i + 3] = 255
      }
      offCtx.putImageData(id, 0, 0)

      grainCtx.imageSmoothingEnabled = false
      grainCtx.drawImage(offscreen, 0, 0, pw, ph, 0, 0, W * dpr, H * dpr)
      grainCache.push(grainCtx.getImageData(0, 0, W * dpr, H * dpr))
    }
    lastGrainScale = s
    lastGrainTint = [...cfg.grainTint]
    lastGrainTintMix = cfg.grainTintMix
  }

  function grainNeedsRebuild() {
    return (
      cfg.grainScale !== lastGrainScale ||
      cfg.grainTintMix !== lastGrainTintMix ||
      cfg.grainTint[0] !== lastGrainTint[0] ||
      cfg.grainTint[1] !== lastGrainTint[1] ||
      cfg.grainTint[2] !== lastGrainTint[2]
    )
  }

  function drawGrain() {
    if (grainNeedsRebuild()) buildGrain()
    grainCanvas.style.opacity = cfg.grainOpacity
    grainIdx = (grainIdx + 1) % grainCache.length
    if (grainCache[grainIdx]) grainCtx.putImageData(grainCache[grainIdx], 0, 0)
  }

  function drawOrbs(t) {
    const [br, bg, bb] = cfg.baseColor

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = `rgb(${br},${bg},${bb})`
    ctx.fillRect(0, 0, W, H)

    ctx.globalCompositeOperation = 'multiply'
    const maxR = Math.max(W, H)

    for (const o of ORB_BASE) {
      const x = (o.px + Math.sin(t * o.fx + o.p) * o.ax * cfg.amplitude) * W
      const y = (o.py + Math.cos(t * o.fy + o.p * 1.3) * o.ay * cfg.amplitude) * H
      const radius = o.r * maxR * cfg.radius
      const [r, g, b] = cfg.colors[o.ci]
      const a = cfg.orbAlpha

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
      grad.addColorStop(0, `rgba(${r},${g},${b},${a})`)
      grad.addColorStop(0.4, `rgba(${r},${g},${b},${(a * 0.55).toFixed(2)})`)
      grad.addColorStop(0.75, `rgba(${r},${g},${b},${(a * 0.14).toFixed(2)})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = `rgba(${br},${bg},${bb},${cfg.veil})`
    ctx.fillRect(0, 0, W, H)
  }

  function draw(ts) {
    drawOrbs(ts * cfg.speed)
    if (Math.round(ts / 16) % cfg.grainFreq === 0) drawGrain()
    requestAnimationFrame(draw)
  }

  // ── Panneau de réglages ──
  const panel = uiRoot.querySelector('.gradient-bg__panel')
  const panelToggleHeader = uiRoot.querySelector('.gradient-bg__panel-header')
  const navToggle = document.querySelector('[data-gradient-panel-toggle]')

  navToggle?.addEventListener('click', () => {
    const visible = panel.classList.toggle('is-visible')
    navToggle.setAttribute('aria-expanded', String(visible))
  })

  panelToggleHeader?.addEventListener('click', () => {
    panel.classList.toggle('is-open')
  })

  const grid = uiRoot.querySelector('.gradient-bg__colors')
  const orbNames = ['①', '②', '③', '④', '⑤', '⑥']

  function rgbToHex([r, g, b]) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }
  function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
  }

  cfg.colors.forEach((col, i) => {
    const wrap = document.createElement('div')
    wrap.className = 'gradient-bg__color-wrap'

    const lbl = document.createElement('label')
    lbl.textContent = orbNames[i]

    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = 'gradient-bg__swatch'
    swatch.style.background = rgbToHex(col)
    swatch.setAttribute('aria-label', `Couleur de l'orbe ${orbNames[i]}`)
    swatch.addEventListener('click', e => {
      e.stopPropagation()
      openColorPicker(swatch, hex => {
        cfg.colors[i] = hexToRgb(hex)
        swatch.style.background = hex
      })
    })

    wrap.append(swatch, lbl)
    grid.append(wrap)
  })

  // ── Sélecteur de couleur — palette du projet (primitives Figma) ──
  const paletteFamilies = new Map()
  PALETTE.forEach(t => {
    if (!paletteFamilies.has(t.groupId)) paletteFamilies.set(t.groupId, [])
    paletteFamilies.get(t.groupId).push(t)
  })

  const picker = document.createElement('div')
  picker.className = 'gradient-bg__color-picker'
  picker.hidden = true

  paletteFamilies.forEach((tints, family) => {
    const section = document.createElement('div')
    section.className = 'gradient-bg__color-picker-group'

    const title = document.createElement('p')
    title.className = 'gradient-bg__color-picker-title'
    title.textContent = family
    section.append(title)

    const row = document.createElement('div')
    row.className = 'gradient-bg__color-picker-row'
    tints.forEach(t => {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'gradient-bg__color-picker-chip'
      chip.style.background = t.hex
      chip.title = t.variable
      chip.dataset.hex = t.hex
      row.append(chip)
    })
    section.append(row)
    picker.append(section)
  })

  document.body.append(picker)

  let activeSwatch = null
  let activeOnPick = null

  function openColorPicker(swatch, onPick) {
    activeSwatch = swatch
    activeOnPick = onPick
    const rect = swatch.getBoundingClientRect()
    picker.hidden = false
    const pickerWidth = picker.offsetWidth
    picker.style.top = `${rect.bottom + 6}px`
    picker.style.left = `${Math.min(rect.left, window.innerWidth - pickerWidth - 8)}px`
  }

  function closeColorPicker() {
    picker.hidden = true
    activeSwatch = null
    activeOnPick = null
  }

  picker.addEventListener('click', e => {
    const chip = e.target.closest('.gradient-bg__color-picker-chip')
    if (!chip || !activeOnPick) return
    activeOnPick(chip.dataset.hex)
    closeColorPicker()
  })

  document.addEventListener('click', e => {
    if (!picker.hidden && !picker.contains(e.target) && e.target !== activeSwatch) closeColorPicker()
  })
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeColorPicker()
  })

  const grainTintSwatch = uiRoot.querySelector('#gbg-grain-tint')
  grainTintSwatch.addEventListener('click', e => {
    e.stopPropagation()
    openColorPicker(grainTintSwatch, hex => {
      cfg.grainTint = hexToRgb(hex)
      grainTintSwatch.style.background = hex
    })
  })

  const baseColorSwatch = uiRoot.querySelector('#gbg-base-color')
  baseColorSwatch.addEventListener('click', e => {
    e.stopPropagation()
    openColorPicker(baseColorSwatch, hex => {
      cfg.baseColor = hexToRgb(hex)
      baseColorSwatch.style.background = hex
    })
  })

  function bindSlider(id, valId, cfgKey, format) {
    const slider = uiRoot.querySelector(`#${id}`)
    const valEl = uiRoot.querySelector(`#${valId}`)
    slider.addEventListener('input', () => {
      cfg[cfgKey] = parseFloat(slider.value)
      valEl.textContent = format(cfg[cfgKey])
    })
  }

  bindSlider('gbg-speed', 'gbg-speed-val', 'speed', v => v.toFixed(1) + '×')
  bindSlider('gbg-amplitude', 'gbg-amplitude-val', 'amplitude', v => v.toFixed(2) + '×')
  bindSlider('gbg-radius', 'gbg-radius-val', 'radius', v => v.toFixed(2) + '×')
  bindSlider('gbg-grain-opacity', 'gbg-grain-val', 'grainOpacity', v => Math.round(v * 100) + '%')
  bindSlider('gbg-grain-scale', 'gbg-grain-scale-val', 'grainScale', v => v + '×')
  bindSlider('gbg-grain-freq', 'gbg-grain-freq-val', 'grainFreq', v => v)
  bindSlider('gbg-grain-tint-mix', 'gbg-grain-tint-val', 'grainTintMix', v => Math.round(v * 100) + '%')
  bindSlider('gbg-orb-alpha', 'gbg-alpha-val', 'orbAlpha', v => Math.round(v * 100) + '%')
  bindSlider('gbg-veil', 'gbg-veil-val', 'veil', v => Math.round(v * 100) + '%')

  function syncUI() {
    const set = (id, value) => {
      const el = uiRoot.querySelector(`#${id}`)
      if (el) el.value = value
    }
    const setText = (id, text) => {
      const el = uiRoot.querySelector(`#${id}`)
      if (el) el.textContent = text
    }
    set('gbg-speed', cfg.speed)
    setText('gbg-speed-val', cfg.speed.toFixed(1) + '×')
    set('gbg-amplitude', cfg.amplitude)
    setText('gbg-amplitude-val', cfg.amplitude.toFixed(2) + '×')
    set('gbg-radius', cfg.radius)
    setText('gbg-radius-val', cfg.radius.toFixed(2) + '×')
    set('gbg-grain-opacity', cfg.grainOpacity)
    setText('gbg-grain-val', Math.round(cfg.grainOpacity * 100) + '%')
    set('gbg-grain-scale', cfg.grainScale)
    setText('gbg-grain-scale-val', cfg.grainScale + '×')
    set('gbg-grain-freq', cfg.grainFreq)
    setText('gbg-grain-freq-val', cfg.grainFreq)
    baseColorSwatch.style.background = rgbToHex(cfg.baseColor)
    grainTintSwatch.style.background = rgbToHex(cfg.grainTint)
    set('gbg-grain-tint-mix', cfg.grainTintMix)
    setText('gbg-grain-tint-val', Math.round(cfg.grainTintMix * 100) + '%')
    set('gbg-orb-alpha', cfg.orbAlpha)
    setText('gbg-alpha-val', Math.round(cfg.orbAlpha * 100) + '%')
    set('gbg-veil', cfg.veil)
    setText('gbg-veil-val', Math.round(cfg.veil * 100) + '%')
    grid.querySelectorAll('.gradient-bg__swatch').forEach((swatch, i) => {
      swatch.style.background = rgbToHex(cfg.colors[i])
    })
  }

  function applyCfg(src) {
    cfg.baseColor = src.baseColor ? [...src.baseColor] : [...DEFAULTS.baseColor]
    cfg.colors = src.colors.map(c => [...c])
    cfg.speed = src.speed
    cfg.amplitude = src.amplitude
    cfg.radius = src.radius
    cfg.grainOpacity = src.grainOpacity
    cfg.grainScale = src.grainScale ?? DEFAULTS.grainScale
    cfg.grainFreq = src.grainFreq ?? DEFAULTS.grainFreq
    cfg.grainTint = src.grainTint ? [...src.grainTint] : [...DEFAULTS.grainTint]
    cfg.grainTintMix = src.grainTintMix ?? DEFAULTS.grainTintMix
    cfg.orbAlpha = src.orbAlpha
    cfg.veil = src.veil
    syncUI()
  }

  uiRoot.querySelector('#gbg-reset').addEventListener('click', () => {
    applyCfg(DEFAULTS)
    uiRoot.querySelector('#gbg-presets-select').value = ''
  })

  function loadPresets() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
      return []
    }
  }
  function savePresets(presets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  }

  const presetsSelect = uiRoot.querySelector('#gbg-presets-select')

  function renderPresetOptions() {
    const presets = loadPresets()
    presetsSelect.innerHTML = '<option value="" disabled selected>Charger un preset…</option>'
    presets.forEach((p, i) => {
      const opt = document.createElement('option')
      opt.value = String(i)
      opt.textContent = p.name
      presetsSelect.append(opt)
    })
  }

  presetsSelect.addEventListener('change', e => {
    const presets = loadPresets()
    const preset = presets[e.target.value]
    if (preset) applyCfg(preset.data)
  })

  uiRoot.querySelector('#gbg-delete-preset').addEventListener('click', () => {
    const idx = parseInt(presetsSelect.value)
    if (Number.isNaN(idx)) return
    const presets = loadPresets()
    presets.splice(idx, 1)
    savePresets(presets)
    renderPresetOptions()
  })

  const overlay = uiRoot.querySelector('.gradient-bg__modal-overlay')
  const modalInput = uiRoot.querySelector('#gbg-modal-input')

  uiRoot.querySelector('#gbg-save-preset').addEventListener('click', () => {
    modalInput.value = ''
    overlay.classList.add('is-open')
    setTimeout(() => modalInput.focus(), 50)
  })

  uiRoot.querySelector('#gbg-modal-cancel').addEventListener('click', () => {
    overlay.classList.remove('is-open')
  })

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('is-open')
  })

  function confirmSave() {
    const name = modalInput.value.trim()
    if (!name) return
    const snapshot = {
      baseColor: [...cfg.baseColor],
      colors: cfg.colors.map(c => [...c]),
      speed: cfg.speed,
      amplitude: cfg.amplitude,
      radius: cfg.radius,
      grainOpacity: cfg.grainOpacity,
      grainScale: cfg.grainScale,
      grainFreq: cfg.grainFreq,
      grainTint: [...cfg.grainTint],
      grainTintMix: cfg.grainTintMix,
      orbAlpha: cfg.orbAlpha,
      veil: cfg.veil,
    }
    const presets = loadPresets()
    presets.push({ name, data: snapshot })
    savePresets(presets)
    renderPresetOptions()
    presetsSelect.value = String(presets.length - 1)
    overlay.classList.remove('is-open')
  }

  uiRoot.querySelector('#gbg-modal-save').addEventListener('click', confirmSave)
  modalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSave()
    if (e.key === 'Escape') overlay.classList.remove('is-open')
  })

  renderPresetOptions()
  syncUI()

  window.addEventListener('resize', resize)
  resize()

  if (reduceMotion) {
    drawOrbs(0)
    drawGrain()
  } else {
    requestAnimationFrame(draw)
  }
}
