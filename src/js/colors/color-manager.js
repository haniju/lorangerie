// ─── Color Manager ──────────────────────────────────────────
// Central state management for the color system.
// Fetches data from the Vite plugin API, manages in-memory state,
// and notifies views via a simple event system.

import { nameToVariable, nameToId, uniqueId } from './color-utils.js'

let state = { groups: [], tints: [], charteUngroupedTintIds: [] }
const listeners = new Set()

// ─── Event system ───────────────────────────────────────────

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  for (const fn of listeners) fn(state)
}

// ─── Getters ────────────────────────────────────────────────

export function getState() {
  return state
}

export function getGroups() {
  return [...state.groups].sort((a, b) => a.order - b.order)
}

export function getTints() {
  return state.tints
}

export function getTintsByGroup(groupId) {
  return state.tints
    .filter(t => t.groupId === groupId)
    .sort((a, b) => a.order - b.order)
}

export function getUngroupedTints() {
  return state.tints
    .filter(t => !t.groupId)
    .sort((a, b) => a.order - b.order)
}

export function getCharteGroups() {
  return getGroups().filter(g => g.showInCharte)
}

export function getCharteTints() {
  // All tints from charte-visible groups + selected ungrouped tints
  const charteTints = []
  for (const group of getCharteGroups()) {
    charteTints.push(...getTintsByGroup(group.id))
  }
  const ungrouped = state.tints.filter(t =>
    !t.groupId && state.charteUngroupedTintIds.includes(t.id)
  )
  charteTints.push(...ungrouped)
  return charteTints
}

export function getTintById(id) {
  return state.tints.find(t => t.id === id)
}

export function getGroupById(id) {
  return state.groups.find(g => g.id === id)
}

// ─── Tint CRUD ──────────────────────────────────────────────

export function addTint({ name, hex, hsl, groupId = null }) {
  const existingIds = state.tints.map(t => t.id)
  const baseId = nameToId(name)
  const id = uniqueId(baseId, existingIds)
  const variable = nameToVariable(name)

  const siblingsInGroup = state.tints.filter(t => t.groupId === groupId)
  const order = siblingsInGroup.length

  state.tints.push({ id, name, variable, hex, hsl, groupId, order })
  notify()
  return id
}

export function updateTint(id, updates) {
  const tint = state.tints.find(t => t.id === id)
  if (!tint) return

  // If name changed, update variable too
  if (updates.name && updates.name !== tint.name) {
    updates.variable = nameToVariable(updates.name)
  }

  Object.assign(tint, updates)
  notify()
}

export function deleteTint(id) {
  state.tints = state.tints.filter(t => t.id !== id)
  state.charteUngroupedTintIds = state.charteUngroupedTintIds.filter(tid => tid !== id)
  notify()
}

// ─── Group CRUD ─────────────────────────────────────────────

export function addGroup(name) {
  const existingIds = state.groups.map(g => g.id)
  const baseId = nameToId(name)
  const id = uniqueId(baseId, existingIds)
  const order = state.groups.length

  state.groups.push({ id, name, order, showInCharte: false })
  notify()
  return id
}

export function renameGroup(id, name) {
  const group = state.groups.find(g => g.id === id)
  if (group) {
    group.name = name
    notify()
  }
}

export function deleteGroup(id) {
  state.groups = state.groups.filter(g => g.id !== id)
  // Move tints from deleted group to ungrouped
  for (const tint of state.tints) {
    if (tint.groupId === id) {
      tint.groupId = null
    }
  }
  notify()
}

export function reorderGroups(orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    const group = state.groups.find(g => g.id === orderedIds[i])
    if (group) group.order = i
  }
  notify()
}

export function toggleGroupInCharte(id) {
  const group = state.groups.find(g => g.id === id)
  if (group) {
    group.showInCharte = !group.showInCharte
    notify()
  }
}

export function toggleUngroupedTintInCharte(tintId) {
  const idx = state.charteUngroupedTintIds.indexOf(tintId)
  if (idx >= 0) {
    state.charteUngroupedTintIds.splice(idx, 1)
  } else {
    state.charteUngroupedTintIds.push(tintId)
  }
  notify()
}

// ─── Move / reorder tints ───────────────────────────────────

export function moveTintToGroup(tintId, newGroupId, options = {}) {
  const tint = state.tints.find(t => t.id === tintId)
  if (!tint) return

  if (options.duplicate) {
    // Create a copy in the new group
    const existingIds = state.tints.map(t => t.id)
    const newId = uniqueId(tint.id, existingIds)
    const siblingsInGroup = state.tints.filter(t => t.groupId === newGroupId)
    state.tints.push({
      ...tint,
      id: newId,
      groupId: newGroupId,
      order: siblingsInGroup.length
    })
  } else {
    const siblingsInGroup = state.tints.filter(t => t.groupId === newGroupId)
    tint.groupId = newGroupId
    tint.order = siblingsInGroup.length
  }
  notify()
}

export function reorderTints(groupId, orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    const tint = state.tints.find(t => t.id === orderedIds[i])
    if (tint) tint.order = i
  }
  notify()
}

// ─── API ────────────────────────────────────────────────────

export async function load() {
  const res = await fetch('/__api/colors')
  state = await res.json()
  notify()
}

export async function save() {
  const res = await fetch('/__api/colors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  })
  return res.json()
}

export async function checkUsage(variable) {
  const res = await fetch('/__api/colors/check-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variable })
  })
  return res.json()
}

export async function replaceVariable(oldVariable, newVariable) {
  const res = await fetch('/__api/colors/replace-variable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldVariable, newVariable })
  })
  return res.json()
}

// ─── Init ───────────────────────────────────────────────────

export async function initColorManager() {
  await load()
}
