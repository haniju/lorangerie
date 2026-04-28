// ─── Tab GENERAL ────────────────────────────────────────────
// Renders all tints in list layout, grouped. Supports multi-select,
// group creation, CRUD operations on groups and tints.

import {
  getGroups, getTintsByGroup, getUngroupedTints,
  addGroup, renameGroup, deleteGroup, addTint, deleteTint,
  moveTintToGroup, subscribe, checkUsage, getTintById
} from './color-manager.js'
import { shouldUseDarkText } from './color-utils.js'
import { showPopup } from './color-popup.js'

let container = null
let onTintClick = null
let selectedTintIds = new Set()

export function initGeneral(el, options) {
  container = el
  onTintClick = options.onTintClick
  subscribe(() => render())
  render()
}

function render() {
  if (!container) return
  const groups = getGroups()
  const ungrouped = getUngroupedTints()

  let html = ''

  // Header with actions
  html += `<div class="ds-general__header">
    <button class="ds-colors__btn" data-action="add-tint">+ Ajouter une teinte</button>
    <button class="ds-colors__btn" data-action="create-group">Creer un groupe</button>
  </div>`

  // Selection bar
  html += `<div class="ds-general__selection-bar ${selectedTintIds.size > 0 ? 'is-visible' : ''}">
    <span class="ds-general__selection-count">${selectedTintIds.size} teinte(s) selectionnee(s)</span>
    <button class="ds-colors__btn" data-action="group-selected">Grouper</button>
    <button class="ds-colors__btn" data-action="clear-selection">Annuler</button>
  </div>`

  // Groups grid
  html += `<div class="ds-general__groups">`

  for (const group of groups) {
    const tints = getTintsByGroup(group.id)
    html += renderGroup(group, tints)
  }

  // Ungrouped
  if (ungrouped.length > 0) {
    html += renderGroup({ id: null, name: 'Sans groupe' }, ungrouped, true)
  }

  html += `</div>`

  container.innerHTML = html
  bindEvents()
}

function renderGroup(group, tints, isUngrouped = false) {
  return `<div class="ds-general__group" data-group-id="${group.id || 'ungrouped'}">
    <div class="ds-general__group-header">
      <span class="ds-general__group-name">${group.name}</span>
      ${!isUngrouped ? `
        <div class="ds-general__group-actions">
          <button class="ds-general__group-btn" data-action="rename-group" data-group-id="${group.id}" title="Renommer">&#9998;</button>
          <button class="ds-general__group-btn" data-action="delete-group" data-group-id="${group.id}" title="Supprimer">&times;</button>
        </div>
      ` : ''}
    </div>
    ${tints.map(t => renderTintRow(t)).join('')}
  </div>`
}

function renderTintRow(tint) {
  const dark = shouldUseDarkText(tint.hsl.l)
  const textColor = dark ? 'var(--color-text-primary)' : '#fff'
  const isSelected = selectedTintIds.has(tint.id)

  return `<div class="ds-general__tint ${isSelected ? 'is-selected' : ''}" data-tint-id="${tint.id}">
    <div class="ds-general__tint-swatch" style="background-color: ${tint.hex}; color: ${textColor};">
      <span class="ds-general__tint-hex">${tint.hex.toUpperCase()}</span>
    </div>
    <span class="ds-general__tint-name">${tint.name}</span>
    <input type="checkbox" class="ds-general__tint-check" ${isSelected ? 'checked' : ''} data-action="select-tint" data-tint-id="${tint.id}">
  </div>`
}

function bindEvents() {
  if (!container) return

  // Add tint
  container.querySelector('[data-action="add-tint"]')?.addEventListener('click', () => {
    if (onTintClick) onTintClick(null) // null = new tint mode
  })

  // Create group
  container.querySelector('[data-action="create-group"]')?.addEventListener('click', () => {
    promptGroupName('Nouveau groupe', (name) => {
      if (name) addGroup(name)
    })
  })

  // Group selected tints
  container.querySelector('[data-action="group-selected"]')?.addEventListener('click', () => {
    promptGroupName('Nom du groupe', (name) => {
      if (!name) return
      const groupId = addGroup(name)
      handleGroupingSelected(groupId)
    })
  })

  // Clear selection
  container.querySelector('[data-action="clear-selection"]')?.addEventListener('click', () => {
    selectedTintIds.clear()
    render()
  })

  // Rename group
  container.querySelectorAll('[data-action="rename-group"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const groupId = btn.dataset.groupId
      const group = getGroups().find(g => g.id === groupId)
      promptGroupName('Renommer le groupe', (name) => {
        if (name) renameGroup(groupId, name)
      }, group?.name)
    })
  })

  // Delete group
  container.querySelectorAll('[data-action="delete-group"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const groupId = btn.dataset.groupId
      const group = getGroups().find(g => g.id === groupId)
      showPopup({
        title: 'Supprimer le groupe',
        text: `Supprimer "${group?.name}" ? Les teintes seront deplacees dans "Sans groupe".`,
        actions: [
          { label: 'Annuler', action: 'close' },
          { label: 'Supprimer', action: 'confirm', primary: true }
        ],
        onAction: (action) => {
          if (action === 'confirm') deleteGroup(groupId)
        }
      })
    })
  })

  // Tint click → open panel
  container.querySelectorAll('.ds-general__tint').forEach(el => {
    el.addEventListener('click', (e) => {
      // Don't open panel if clicking checkbox
      if (e.target.closest('[data-action="select-tint"]')) return
      if (onTintClick) onTintClick(el.dataset.tintId)
    })
  })

  // Tint select checkbox
  container.querySelectorAll('[data-action="select-tint"]').forEach(input => {
    input.addEventListener('change', (e) => {
      e.stopPropagation()
      const tintId = input.dataset.tintId
      if (input.checked) {
        selectedTintIds.add(tintId)
      } else {
        selectedTintIds.delete(tintId)
      }
      render()
    })
  })
}

function handleGroupingSelected(newGroupId) {
  const tintIds = [...selectedTintIds]

  // Check if any selected tints already belong to a group
  const tintsWithGroup = tintIds
    .map(id => getTintById(id))
    .filter(t => t && t.groupId)

  if (tintsWithGroup.length > 0) {
    showPopup({
      title: 'Teintes deja groupees',
      text: `${tintsWithGroup.length} teinte(s) appartiennent deja a un groupe. Que souhaitez-vous faire ?`,
      actions: [
        { label: 'Annuler', action: 'close' },
        { label: 'Dupliquer', action: 'duplicate' },
        { label: 'Deplacer', action: 'move', primary: true }
      ],
      onAction: (action) => {
        if (action === 'close') return
        for (const id of tintIds) {
          const tint = getTintById(id)
          if (!tint) continue
          if (tint.groupId && tint.groupId !== newGroupId) {
            moveTintToGroup(id, newGroupId, { duplicate: action === 'duplicate' })
          } else {
            moveTintToGroup(id, newGroupId)
          }
        }
        selectedTintIds.clear()
      }
    })
  } else {
    for (const id of tintIds) {
      moveTintToGroup(id, newGroupId)
    }
    selectedTintIds.clear()
  }
}

function promptGroupName(title, callback, defaultValue = '') {
  showPopup({
    title,
    text: '',
    input: true,
    inputValue: defaultValue,
    inputPlaceholder: 'Nom du groupe',
    actions: [
      { label: 'Annuler', action: 'close' },
      { label: 'Valider', action: 'confirm', primary: true }
    ],
    onAction: (action, inputValue) => {
      if (action === 'confirm') callback(inputValue)
    }
  })
}
