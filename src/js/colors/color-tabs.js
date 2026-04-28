// ─── Tab System ─────────────────────────────────────────────
// Handles switching between CHARTE and GENERAL tabs.

let activeTab = 'charte'
let onTabChange = null

export function initTabs(container, callback) {
  onTabChange = callback

  const tabs = container.querySelectorAll('[data-tab]')
  const contents = container.querySelectorAll('[data-tab-content]')

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab
      if (tabName === activeTab) return

      activeTab = tabName

      // Update active states
      tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === activeTab))
      contents.forEach(c => {
        c.classList.toggle('is-active', c.dataset.tabContent === activeTab)
      })

      if (onTabChange) onTabChange(activeTab)
    })
  })

  // Set initial state
  contents.forEach(c => {
    c.classList.toggle('is-active', c.dataset.tabContent === activeTab)
  })
}

export function getActiveTab() {
  return activeTab
}

export function setActiveTab(tabName) {
  const tab = document.querySelector(`[data-tab="${tabName}"]`)
  if (tab) tab.click()
}
