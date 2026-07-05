// ============================================================================
//  code.js — Color Tokens (lorangerie)
//  Plugin dédié couleurs :
//   • liste toutes les variables couleur, par collection et par groupe
//   • browse les nœuds qui utilisent une variable (remplissage / bordure)
//   • exporte en JSON RANGÉ (structure collections → groupes → variables)
//     à partir d'une sélection (collections / groupes / variables).
// ============================================================================

figma.showUI(__html__, { width: 400, height: 660, themeColors: true });

let COLLECTIONS = [];
let VARS = [];            // variables COULEUR
let varById = new Map();  // TOUTES les variables (pour résoudre les alias)
let colById = new Map();

async function loadIndex() {
  COLLECTIONS = await figma.variables.getLocalVariableCollectionsAsync();
  const all = await figma.variables.getLocalVariablesAsync();
  varById = new Map(all.map(v => [v.id, v]));
  colById = new Map(COLLECTIONS.map(c => [c.id, c]));
  VARS = all.filter(v => v.resolvedType === "COLOR");
}

// ---------------------------------------------------------------------------
//  Couleur
// ---------------------------------------------------------------------------
function rgbaToHex({ r, g, b, a }) {
  const c = x => Math.round(x * 255).toString(16).padStart(2, "0");
  const hex = ("#" + c(r) + c(g) + c(b)).toUpperCase();
  return (a == null || a >= 1) ? hex : hex + c(a);
}

function resolveColor(variable, visited) {
  const col = colById.get(variable.variableCollectionId);
  if (!col) return null;
  const raw = variable.valuesByMode[col.defaultModeId];
  if (raw == null) return null;
  if (raw.type === "VARIABLE_ALIAS") {
    if (visited.has(raw.id)) return null;
    visited.add(raw.id);
    const t = varById.get(raw.id);
    return t ? resolveColor(t, visited) : null;
  }
  return rgbaToHex(raw);
}

// Liste plate pour construire l'arbre côté UI
function buildColorList() {
  return VARS.map(v => ({
    id: v.id,
    name: v.name,
    collection: (colById.get(v.variableCollectionId) || {}).name || "?",
    hex: resolveColor(v, new Set([v.id])) || "#000000"
  })).sort((a, b) => a.name.localeCompare(b.name));
}

// Descripteur complet d'une variable (pour l'export)
function descriptor(v) {
  const col = colById.get(v.variableCollectionId);
  const raw = col ? v.valuesByMode[col.defaultModeId] : null;
  const d = { name: v.name, id: v.id, collection: col ? col.name : "?", scopes: v.scopes };
  if (raw && raw.type === "VARIABLE_ALIAS") {
    const t = varById.get(raw.id);
    d.alias = t ? t.name : null;   // primitive _base d'origine
    d.external = !t;
    d.value = resolveColor(v, new Set([v.id]));
  } else if (raw) {
    d.value = rgbaToHex(raw);
  } else {
    d.value = null;
  }
  return d;
}

// ---------------------------------------------------------------------------
//  Export RANGÉ (structure préservée) + miroir plat (compat pipeline)
//  selectedIds = null -> tout ; sinon -> sous-ensemble
// ---------------------------------------------------------------------------
function buildExport(selectedIds) {
  const set = selectedIds ? new Set(selectedIds) : null;
  const chosen = VARS.filter(v => !set || set.has(v.id));

  const out = {
    meta: {
      exportedAt: new Date().toISOString(),
      type: "COLOR",
      count: chosen.length,
      scope: set ? "selection" : "all"
    },
    collections: {},   // structure : collection -> arbre de groupes -> variables (feuilles)
    variables: []      // miroir plat (consommé par figma-to-colors.js)
  };

  for (const v of chosen) {
    const d = descriptor(v);
    out.variables.push(d);

    const col = colById.get(v.variableCollectionId);
    const cname = col ? col.name : "?";
    if (!out.collections[cname]) {
      out.collections[cname] = {
        mode: col && col.modes[0] ? col.modes[0].name : null,
        tree: {}
      };
    }
    // Nidification par chemin : les segments intermédiaires = groupes,
    // le dernier segment = feuille (le descripteur, reconnaissable à `value`).
    const parts = v.name.split("/");
    let node = out.collections[cname].tree;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = d;
  }
  return out;
}

// ---------------------------------------------------------------------------
//  Usages (remplissage / bordure)
// ---------------------------------------------------------------------------
function rolesForColorVar(node, varId) {
  const bv = node.boundVariables;
  if (!bv) return [];
  const roles = [];
  const hit = v => Array.isArray(v) ? v.some(x => x && x.id === varId) : (v && v.id === varId);
  if (hit(bv.fills)) roles.push("remplissage");
  if (hit(bv.strokes)) roles.push("bordure");
  return roles;
}

async function scanUsages(varId) {
  const roleCounts = {};
  const pages = figma.root.children;
  let total = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    await page.loadAsync();

    const rows = [];
    for (const n of page.findAll(node => !!node.boundVariables)) {
      for (const role of rolesForColorVar(n, varId)) {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
        rows.push({ id: n.id, page: page.name, name: (n.name || "").slice(0, 40), role });
      }
    }
    total += rows.length;

    // Résultats de cette page envoyés tout de suite (remplissage progressif)
    figma.ui.postMessage({
      type: "usages-chunk",
      rows: rows,
      roleCounts: roleCounts,
      done: i === pages.length - 1,
      progress: { page: i + 1, pages: pages.length, total: total }
    });

    // On rend la main au thread principal : Figma reste utilisable entre 2 pages
    await new Promise(r => setTimeout(r, 0));
  }
}

// ---------------------------------------------------------------------------
//  Navigation
// ---------------------------------------------------------------------------
function pageOf(node) { let p = node; while (p && p.type !== "PAGE") p = p.parent; return p; }

async function focusNode(id) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { figma.notify("Calque introuvable"); return; }
  const p = pageOf(n);
  if (p && p.id !== figma.currentPage.id) await figma.setCurrentPageAsync(p);
  figma.currentPage.selection = [n];
  figma.viewport.scrollAndZoomIntoView([n]);
}

async function selectAll(ids) {
  const nodes = [];
  for (const id of ids || []) {
    const n = await figma.getNodeByIdAsync(id);
    if (n && pageOf(n) && pageOf(n).id === figma.currentPage.id) nodes.push(n);
  }
  if (!nodes.length) { figma.notify("Rien à sélectionner sur cette page"); return; }
  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
}

// ---------------------------------------------------------------------------
//  Routeur
// ---------------------------------------------------------------------------
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "init":
      await loadIndex();
      figma.ui.postMessage({ type: "list", colors: buildColorList() });
      break;
    case "scan":
      await scanUsages(msg.id);   // envoie ses résultats en flux (usages-chunk)
      break;
    case "resize":
      figma.ui.resize(Math.max(320, Math.round(msg.w)), Math.max(320, Math.round(msg.h)));
      break;
    case "focus":
      await focusNode(msg.id);
      break;
    case "select-all":
      await selectAll(msg.ids);
      break;
    case "export":
      figma.ui.postMessage({ type: "exported", data: buildExport(msg.ids || null) });
      break;
    case "close":
      figma.closePlugin();
      break;
  }
};
