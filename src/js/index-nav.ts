// Comportement touch du rail index-nav (règles R12–R13).
// Hold 300ms sur un point → label visible (initial).
// Glissement vers un autre point → transfert du hold.
// Glissement sur l'étiquette → pressed.
// Scroll lock pendant le hold (preventDefault sur touchmove).

const HOLD_DELAY = 300

export function initIndexNavTouch(root: ParentNode = document) {
  const allCollapsed = Array.from(
    root.querySelectorAll<HTMLElement>('.index-nav__item--collapsed')
  )
  if (!allCollapsed.length) return

  let activeEl: HTMLElement | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const clearActive = () => {
    activeEl?.classList.remove('is-touch-held', 'is-label-pressed')
    activeEl = null
  }

  const activate = (el: HTMLElement) => {
    if (el === activeEl) return
    clearActive()
    activeEl = el
    el.classList.add('is-touch-held')
  }

  const reset = () => {
    if (timer) { clearTimeout(timer); timer = null }
    clearActive()
  }

  allCollapsed.forEach((el) => {
    el.addEventListener('contextmenu', (e) => e.preventDefault())

    el.addEventListener('touchstart', () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => activate(el), HOLD_DELAY)
    }, { passive: true })

    el.addEventListener('touchmove', (e) => {
      const t = e.touches[0]
      const target = document.elementFromPoint(t.clientX, t.clientY)

      if (activeEl) e.preventDefault()

      if (timer || activeEl) {
        const hovered = allCollapsed.find(
          (item) => item === target || item.contains(target)
        )
        if (hovered && hovered !== activeEl) {
          if (timer) { clearTimeout(timer); timer = null }
          activate(hovered)
        }
      }

      if (activeEl) {
        const label = activeEl.querySelector('.index-nav__label')
        activeEl.classList.toggle('is-label-pressed', !!label?.contains(target))
      }
    }, { passive: false })

    el.addEventListener('touchend', reset)
    el.addEventListener('touchcancel', reset)
  })
}
