// ─── Tab CHARTE ─────────────────────────────────────────────
// Renders groups as swatch grids. Provides a dropdown for
// selecting which groups/tints appear in the Charte tab.

import {
  getCharteGroups, getTintsByGroup, getGroups, getUngroupedTints,
  toggleGroupInCharte, toggleUngroupedTintInCharte, reorderGroups,
  subscribe, getState
} from './color-manager.js'
import { shouldUseDarkText } from './color-utils.js'

let container = null
let onSwatchClick = null
let dropdownOpen = false

export function initCharte(el, options) {
  container = el
  onSwatchClick = options.onSwatchClick
  subscribe(() => render())
  render()
}

function render() {
  if (!container) return
  const charteGroups = getCharteGroups()
  const state = getState()

  // Ungrouped tints selected for charte
  const ungroupedCharte = state.tints.filter(t =>
    !t.groupId && state.charteUngroupedTintIds.includes(t.id)
  ).sort((a, b) => a.order - b.order)

  let html = ''

  // Dropdown trigger (attached to the tab header via JS)
  // Rendered inside the tab content for now
  html += `<div class="ds-charte__dropdown-wrap" style="position: relative; display: inline-block; margin-bottom: var(--space-m);">
    <button class="ds-colors__tab-btn" data-action="toggle-dropdown" title="Configurer la charte">&#9998;</button>
    <div class="ds-charte__dropdown ${dropdownOpen ? 'is-open' : ''}">
      <div class="ds-charte__dropdown-title">Groupes</div>
      ${getGroups().map(g => `
        <div class="ds-charte__dropdown-item" draggable="true" data-group-id="${g.id}">
          <span class="drag-handle">&#9776;</span>
          <input type="checkbox" ${g.showInCharte ? 'checked' : ''} data-action="toggle-group" data-group-id="${g.id}">
          <span>${g.name}</span>
        </div>
      `).join('')}
      ${getUngroupedTints().length > 0 ? `
        <div class="ds-charte__dropdown-title" style="margin-top: var(--space-xs);">Teintes sans groupe</div>
        ${getUngroupedTints().map(t => `
          <div class="ds-charte__dropdown-item">
            <input type="checkbox" ${state.charteUngroupedTintIds.includes(t.id) ? 'checked' : ''} data-action="toggle-ungrouped" data-tint-id="${t.id}">
            <span style="display:inline-block;width:0.8em;height:0.8em;background:${t.hex};border:1px solid var(--color-border);"></span>
            <span>${t.name}</span>
          </div>
        `).join('')}
      ` : ''}
    </div>
  </div>`

  // Render groups
  for (const group of charteGroups) {
    const tints = getTintsByGroup(group.id)
    if (tints.length === 0) continue

    html += `<div class="ds-charte__group">
      <div class="ds-charte__group-name">${group.name}</div>
      <div class="ds-charte__swatches">
        ${tints.map(t => renderSwatch(t)).join('')}
      </div>
    </div>`
  }

  // Render ungrouped tints selected for charte
  if (ungroupedCharte.length > 0) {
    html += `<div class="ds-charte__group">
      <div class="ds-charte__group-name">Sans groupe</div>
      <div class="ds-charte__swatches">
        ${ungroupedCharte.map(t => renderSwatch(t)).join('')}
      </div>
    </div>`
  }

  if (charteGroups.length === 0 && ungroupedCharte.length === 0) {
    html += `<p style="color: var(--color-text-secondary); font-family: var(--font-body); font-size: var(--step--1);">Aucun groupe selectionne. Utilisez le bouton &#9998; pour configurer la charte.</p>`
  }

  container.innerHTML = html
  bindEvents()
}

function renderSwatch(tint) {
  const dark = shouldUseDarkText(tint.hsl.l)
  const textColor = dark ? 'var(--color-text-primary)' : 'var(--color-text-inverse)'

  return `<div class="ds-charte__swatch" data-tint-id="${tint.id}">
    <div class="ds-charte__swatch-color" style="background-color: ${tint.hex}; color: ${textColor};">
      <span class="ds-charte__swatch-edit">&#9998;</span>
    </div>
    <div class="ds-charte__swatch-info">
      <div class="ds-charte__swatch-hex">${tint.hex.toUpperCase()}</div>
      <div class="ds-charte__swatch-name">${tint.name}</div>
    </div>
  </div>`
}

function bindEvents() {
  if (!container) return

  // Dropdown toggle
  container.querySelector('[data-action="toggle-dropdown"]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    dropdownOpen = !dropdownOpen
    const dropdown = container.querySelector('.ds-charte__dropdown')
    if (dropdown) dropdown.classList.toggle('is-open', dropdownOpen)
  })

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (dropdownOpen && !e.target.closest('.ds-charte__dropdown-wrap')) {
      dropdownOpen = false
      const dropdown = container.querySelector('.ds-charte__dropdown')
      if (dropdown) dropdown.classList.remove('is-open')
    }
  })

  // Toggle group in charte
  container.querySelectorAll('[data-action="toggle-group"]').forEach(input => {
    input.addEventListener('change', () => {
      toggleGroupInCharte(input.dataset.groupId)
    })
  })

  // Toggle ungrouped tint in charte
  container.querySelectorAll('[data-action="toggle-ungrouped"]').forEach(input => {
    input.addEventListener('change', () => {
      toggleUngroupedTintInCharte(input.dataset.tintId)
    })
  })

  // Swatch click → open panel
  container.querySelectorAll('.ds-charte__swatch').forEach(el => {
    el.addEventListener('click', () => {
      if (onSwatchClick) onSwatchClick(el.dataset.tintId)
    })
  })

  // Drag & drop for group reordering in dropdown
  const items = container.querySelectorAll('.ds-charte__dropdown-item[draggable]')
  let draggedId = null

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedId = item.dataset.groupId
      e.dataTransfer.effectAllowed = 'move'
      item.style.opacity = '0.5'
    })

    item.addEventListener('dragend', () => {
      item.style.opacity = '1'
      draggedId = null
    })

    item.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    })

    item.addEventListener('drop', (e) => {
      e.preventDefault()
      if (!draggedId || draggedId === item.dataset.groupId) return

      // Reorder: collect current order from DOM
      const allItems = [...container.querySelectorAll('.ds-charte__dropdown-item[draggable]')]
      const orderedIds = allItems.map(i => i.dataset.groupId)
      const fromIdx = orderedIds.indexOf(draggedId)
      const toIdx = orderedIds.indexOf(item.dataset.groupId)
      orderedIds.splice(fromIdx, 1)
      orderedIds.splice(toIdx, 0, draggedId)

      reorderGroups(orderedIds)
    })
  })
}
