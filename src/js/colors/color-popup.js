// ─── Popup / Modal ──────────────────────────────────────────
// Simple popup for confirmations, group naming, etc.

let popupEl = null
let currentOnAction = null

export function initPopup() {
  popupEl = document.getElementById('color-popup')
  if (!popupEl) return

  popupEl.addEventListener('click', (e) => {
    if (e.target === popupEl) closePopup()
  })
}

export function showPopup({ title, text, actions, onAction, input = false, inputValue = '', inputPlaceholder = '' }) {
  if (!popupEl) return
  currentOnAction = onAction

  const titleEl = popupEl.querySelector('.ds-popup__title')
  const textEl = popupEl.querySelector('.ds-popup__text')
  const actionsEl = popupEl.querySelector('.ds-popup__actions')

  titleEl.textContent = title

  // Text or input field
  if (input) {
    textEl.innerHTML = `<input type="text" class="ds-color-panel__name-input" id="popup-input" value="${inputValue}" placeholder="${inputPlaceholder}" style="width: 100%;">`
  } else {
    textEl.textContent = text
  }

  // Actions
  actionsEl.innerHTML = actions.map(a => `
    <button class="ds-colors__btn ${a.primary ? 'ds-colors__btn--primary' : ''}" data-popup-action="${a.action}">
      ${a.label}
    </button>
  `).join('')

  popupEl.classList.add('is-open')

  // Focus input if present
  const inputEl = popupEl.querySelector('#popup-input')
  if (inputEl) {
    setTimeout(() => {
      inputEl.focus()
      inputEl.select()
    }, 50)

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAction('confirm', inputEl.value)
      }
    })
  }

  // Bind action buttons
  actionsEl.querySelectorAll('[data-popup-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.popupAction
      const inputVal = popupEl.querySelector('#popup-input')?.value || ''
      handleAction(action, inputVal)
    })
  })
}

function handleAction(action, inputValue) {
  closePopup()
  if (currentOnAction) {
    currentOnAction(action, inputValue)
    currentOnAction = null
  }
}

function closePopup() {
  if (popupEl) popupEl.classList.remove('is-open')
}
