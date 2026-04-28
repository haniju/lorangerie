// ─── Colors Module Entry Point ──────────────────────────────
// Initializes the color management system on the design-system page.

import { initColorManager, save } from './color-manager.js'
import { initTabs } from './color-tabs.js'
import { initCharte } from './color-charte.js'
import { initGeneral } from './color-general.js'
import { initPanel, openPanel } from './color-panel.js'
import { initPopup } from './color-popup.js'

export async function initColors() {
  // Load color data from API
  await initColorManager()

  const colorsContainer = document.querySelector('.ds-colors')
  if (!colorsContainer) return

  // Init popup system
  initPopup()

  // Init panel
  initPanel()

  // Init tabs
  const charteContent = colorsContainer.querySelector('[data-tab-content="charte"]')
  const generalContent = colorsContainer.querySelector('[data-tab-content="general"]')

  initTabs(colorsContainer, (tab) => {
    // Tab changed — could trigger re-render if needed
  })

  // Init Charte tab
  initCharte(charteContent, {
    onSwatchClick: (tintId) => openPanel(tintId)
  })

  // Init General tab
  initGeneral(generalContent, {
    onTintClick: (tintId) => openPanel(tintId)
  })

  // Auto-save on group/tint charte toggle changes
  // (The panel handles its own save on the "Enregistrer" button)
}
