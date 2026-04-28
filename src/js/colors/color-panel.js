// ─── Color Panel (HSL Picker) ───────────────────────────────
// Bottom panel with HSL sliders on the left and a catalog of
// existing tints on the right.

import {
  getGroups, getTintsByGroup, getUngroupedTints,
  getTintById, getGroupById, updateTint, addTint, deleteTint,
  subscribe, save, checkUsage
} from './color-manager.js'
import { hslToHex, shouldUseDarkText } from './color-utils.js'
import { showPopup } from './color-popup.js'

let panelEl = null
let isOpen = false
let editingTintId = null // null = creating new tint
let currentHsl = { h: 0, s: 0, l: 50 }
let currentName = ''
let originalHsl = null
let originalName = ''

export function initPanel() {
  panelEl = document.getElementById('color-panel')
  if (!panelEl) return
  subscribe(() => { if (isOpen) renderCatalog() })
}

export function openPanel(tintId = null) {
  if (!panelEl) return

  editingTintId = tintId

  if (tintId) {
    const tint = getTintById(tintId)
    if (!tint) return
    currentHsl = { ...tint.hsl }
    currentName = tint.name
    originalHsl = { ...tint.hsl }
    originalName = tint.name
  } else {
    currentHsl = { h: 180, s: 50, l: 50 }
    currentName = ''
    originalHsl = null
    originalName = ''
  }

  renderPanel()
  isOpen = true
  panelEl.classList.add('is-open')
  highlightEditingTint()
}

export function closePanel() {
  if (!panelEl) return
  clearEditingHighlight()
  isOpen = false
  panelEl.classList.remove('is-open')
  editingTintId = null
  originalHsl = null
  originalName = ''

  // Remove live preview overrides
  document.documentElement.style.cssText = ''
}

function cancelPanel() {
  if (!panelEl) return

  // Restore original CSS property if we were editing
  if (editingTintId && originalHsl) {
    const tint = getTintById(editingTintId)
    if (tint) {
      const originalHex = hslToHex(originalHsl.h, originalHsl.s, originalHsl.l)
      document.documentElement.style.setProperty(`--${tint.variable}`, originalHex)
    }
  }

  closePanel()
}

export function isPanelOpen() {
  return isOpen
}

function renderPanel() {
  if (!panelEl) return

  const hex = hslToHex(currentHsl.h, currentHsl.s, currentHsl.l)
  const groupName = editingTintId
    ? (getGroupById(getTintById(editingTintId)?.groupId)?.name || 'Sans groupe')
    : 'Nouvelle teinte'

  panelEl.innerHTML = `
    <button class="ds-color-panel__close" data-action="close-panel">&times;</button>
    <div class="ds-color-panel__left">
      <span class="ds-color-panel__group-label">${groupName}</span>
      <div class="ds-color-panel__sliders">
        <div class="ds-color-panel__slider-row">
          <span class="ds-color-panel__slider-label">T</span>
          <input type="range" class="ds-color-panel__slider" data-channel="h" min="0" max="360" value="${currentHsl.h}"
            style="background: linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%));">
        </div>
        <div class="ds-color-panel__slider-row">
          <span class="ds-color-panel__slider-label">S</span>
          <input type="range" class="ds-color-panel__slider" data-channel="s" min="0" max="100" value="${currentHsl.s}"
            style="background: linear-gradient(to right, hsl(${currentHsl.h},0%,${currentHsl.l}%), hsl(${currentHsl.h},100%,${currentHsl.l}%));">
        </div>
        <div class="ds-color-panel__slider-row">
          <span class="ds-color-panel__slider-label">L</span>
          <input type="range" class="ds-color-panel__slider" data-channel="l" min="0" max="100" value="${currentHsl.l}"
            style="background: linear-gradient(to right, hsl(${currentHsl.h},${currentHsl.s}%,0%), hsl(${currentHsl.h},${currentHsl.s}%,50%), hsl(${currentHsl.h},${currentHsl.s}%,100%));">
        </div>
      </div>
      <div class="ds-color-panel__footer">
        <span class="ds-color-panel__hex">${hex.toUpperCase()}</span>
        <input type="text" class="ds-color-panel__name-input" value="${currentName}" placeholder="Nom de la teinte" data-action="name-input">
        <button class="ds-colors__btn" data-action="cancel">Annuler</button>
        <button class="ds-colors__btn ds-colors__btn--primary" data-action="save" ${!currentName.trim() ? 'disabled' : ''}>Enregistrer</button>
        ${editingTintId ? `<button class="ds-colors__btn" data-action="delete" style="color: var(--color-red, #A10702);">Supprimer</button>` : ''}
      </div>
    </div>
    <div class="ds-color-panel__right" id="panel-catalog"></div>
  `

  renderCatalog()
  bindPanelEvents()
}

function renderCatalog() {
  const catalogEl = panelEl?.querySelector('#panel-catalog')
  if (!catalogEl) return

  const groups = getGroups()
  const ungrouped = getUngroupedTints()

  let html = ''

  for (const group of groups) {
    const tints = getTintsByGroup(group.id)
    if (tints.length === 0) continue

    html += `<div class="ds-color-panel__catalog-group">
      <div class="ds-color-panel__catalog-group-name">${group.name}</div>
      ${tints.map(t => `
        <div class="ds-color-panel__catalog-tint" data-catalog-tint-id="${t.id}">
          <div class="ds-color-panel__catalog-swatch" style="background-color: ${t.hex};"></div>
          <span>${t.name}</span>
        </div>
      `).join('')}
    </div>`
  }

  if (ungrouped.length > 0) {
    html += `<div class="ds-color-panel__catalog-group">
      <div class="ds-color-panel__catalog-group-name">Sans groupe</div>
      ${ungrouped.map(t => `
        <div class="ds-color-panel__catalog-tint" data-catalog-tint-id="${t.id}">
          <div class="ds-color-panel__catalog-swatch" style="background-color: ${t.hex};"></div>
          <span>${t.name}</span>
        </div>
      `).join('')}
    </div>`
  }

  catalogEl.innerHTML = html

  // Bind catalog clicks — load HSL values as starting point
  // but keep editing the original tint (don't switch editingTintId)
  catalogEl.querySelectorAll('[data-catalog-tint-id]').forEach(el => {
    el.addEventListener('click', () => {
      const tint = getTintById(el.dataset.catalogTintId)
      if (tint) {
        currentHsl = { ...tint.hsl }
        // Keep the original tint's name and editingTintId unchanged
        renderPanel()
        updateLivePreview()
      }
    })
  })
}

function bindPanelEvents() {
  if (!panelEl) return

  // Close / Cancel
  panelEl.querySelector('[data-action="close-panel"]')?.addEventListener('click', cancelPanel)
  panelEl.querySelector('[data-action="cancel"]')?.addEventListener('click', cancelPanel)

  // Sliders
  panelEl.querySelectorAll('.ds-color-panel__slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const channel = slider.dataset.channel
      currentHsl[channel] = parseInt(slider.value, 10)
      updateSliderGradients()
      updatePreview()
      updateLivePreview()
    })
  })

  // Name input
  const nameInput = panelEl.querySelector('[data-action="name-input"]')
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      currentName = nameInput.value
      const saveBtn = panelEl.querySelector('[data-action="save"]')
      if (saveBtn) saveBtn.disabled = !currentName.trim()
    })
  }

  // Save
  panelEl.querySelector('[data-action="save"]')?.addEventListener('click', handleSave)

  // Delete
  panelEl.querySelector('[data-action="delete"]')?.addEventListener('click', handleDelete)
}

function updateSliderGradients() {
  const sSlider = panelEl.querySelector('[data-channel="s"]')
  const lSlider = panelEl.querySelector('[data-channel="l"]')

  if (sSlider) {
    sSlider.style.background = `linear-gradient(to right, hsl(${currentHsl.h},0%,${currentHsl.l}%), hsl(${currentHsl.h},100%,${currentHsl.l}%))`
  }
  if (lSlider) {
    lSlider.style.background = `linear-gradient(to right, hsl(${currentHsl.h},${currentHsl.s}%,0%), hsl(${currentHsl.h},${currentHsl.s}%,50%), hsl(${currentHsl.h},${currentHsl.s}%,100%))`
  }
}

function updatePreview() {
  const hex = hslToHex(currentHsl.h, currentHsl.s, currentHsl.l)
  const hexEl = panelEl.querySelector('.ds-color-panel__hex')
  if (hexEl) hexEl.textContent = hex.toUpperCase()
}

function updateLivePreview() {
  if (!editingTintId) return
  const tint = getTintById(editingTintId)
  if (!tint) return

  const hex = hslToHex(currentHsl.h, currentHsl.s, currentHsl.l)
  // Live update the CSS custom property
  document.documentElement.style.setProperty(`--${tint.variable}`, hex)

  // Also update the swatch in the charte/general views
  const swatches = document.querySelectorAll(`[data-tint-id="${editingTintId}"]`)
  swatches.forEach(el => {
    const colorEl = el.querySelector('.ds-charte__swatch-color') || el.querySelector('.ds-general__tint-swatch')
    if (colorEl) {
      colorEl.style.backgroundColor = hex
      const dark = shouldUseDarkText(currentHsl.l)
      colorEl.style.color = dark ? 'var(--color-text-primary)' : '#fff'
    }
    const hexEl = el.querySelector('.ds-charte__swatch-hex') || el.querySelector('.ds-general__tint-hex')
    if (hexEl) hexEl.textContent = hex.toUpperCase()
  })
}

async function handleSave() {
  const hex = hslToHex(currentHsl.h, currentHsl.s, currentHsl.l)

  if (editingTintId) {
    updateTint(editingTintId, {
      name: currentName.trim(),
      hex,
      hsl: { ...currentHsl }
    })
  } else {
    editingTintId = addTint({
      name: currentName.trim(),
      hex,
      hsl: { ...currentHsl }
    })
  }

  await save()
  closePanel()
}

async function handleDelete() {
  if (!editingTintId) return
  const tint = getTintById(editingTintId)
  if (!tint) return

  // Check if variable is used in SCSS
  const usage = await checkUsage(tint.variable)

  if (usage.usages && usage.usages.length > 0) {
    showPopup({
      title: 'Teinte utilisee',
      text: `"${tint.name}" (--${tint.variable}) est utilisee dans ${usage.usages.length} fichier(s): ${usage.usages.join(', ')}. Choisissez une teinte de remplacement ou annulez.`,
      actions: [
        { label: 'Annuler', action: 'close' },
        { label: 'Supprimer quand meme', action: 'force', primary: true }
      ],
      onAction: async (action) => {
        if (action === 'force') {
          deleteTint(editingTintId)
          await save()
          closePanel()
        }
      }
    })
  } else {
    deleteTint(editingTintId)
    await save()
    closePanel()
  }
}

function highlightEditingTint() {
  clearEditingHighlight()
  if (!editingTintId) return
  document.querySelectorAll(`[data-tint-id="${editingTintId}"]`).forEach(el => {
    el.classList.add('is-editing')
  })
}

function clearEditingHighlight() {
  document.querySelectorAll('.is-editing').forEach(el => {
    el.classList.remove('is-editing')
  })
}
