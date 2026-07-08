// Comportement touch du rail index-nav (règles R12–R13).
// Hold 300ms sur un point → label visible (initial).
// Glissement vers un autre point → transfert du hold.
// Glissement sur l'étiquette → pressed.
// Scroll lock pendant le hold (preventDefault sur touchmove).

const HOLD_DELAY = 300

// ─── Scrollspy (R4, R7, R8, R11) ─────────────────────────────────────────────
// IO 1 : sections → item actif (--start) / inactif (--collapsed)
// IO 2 : [data-sentinel-for] → item actif profond (--bellow) + label déco --bellow

export function initIndexNavScrollspy() {
  const main = document.querySelector<HTMLElement>('main')
  if (!main) return

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
  if (!items.length) return

  const itemMap = new Map(items.map((el) => [el.dataset.section!, el]))

  let activeId: string | null = null
  const passedSections = new Set<string>()

  const getDecoLabel = (id: string) =>
    document.querySelector<HTMLElement>(`[data-label-for="${id}"]`)

  function setActive(id: string) {
    if (id === activeId) return

    if (activeId) {
      const prev = itemMap.get(activeId)
      if (prev) {
        prev.classList.remove('index-nav__item--start', 'index-nav__item--bellow')
        prev.classList.add('index-nav__item--collapsed')
        prev.removeAttribute('aria-current')
      }
    }

    activeId = id
    const curr = itemMap.get(id)
    if (curr) {
      curr.classList.remove('index-nav__item--collapsed', 'index-nav__item--bellow')
      curr.classList.add('index-nav__item--start')
      curr.setAttribute('aria-current', 'true')
    }
  }

  function recompute() {
    let newActive: string | null = null
    for (const item of items) {
      const id = item.dataset.section!
      if (passedSections.has(id)) newActive = id
    }
    if (newActive) setActive(newActive)
  }

  // Scroll listener — section active = dernière dont le haut a franchi le haut de <main>
  // (IO threshold:0 ne se déclenche que quand toute la section est sortie, trop tard)
  const sectionEls = items
    .map((item) => document.getElementById(item.dataset.section!))
    .filter(Boolean) as HTMLElement[]

  function updateActive() {
    const mainTop = main.getBoundingClientRect().top
    let newId = sectionEls[0].id
    for (const el of sectionEls) {
      if (el.getBoundingClientRect().top <= mainTop + 1) newId = el.id
    }

    // Retour arrière : si la section qui redevient active était en --bellow, reset
    if (newId !== activeId) {
      const incoming = itemMap.get(newId)
      if (incoming?.classList.contains('index-nav__item--bellow')) {
        incoming.classList.remove('index-nav__item--bellow')
        incoming.classList.add('index-nav__item--start')
        getDecoLabel(newId)?.classList.remove('section-label-deco--bellow')
      }
      setActive(newId)
    }
  }

  main.addEventListener('scroll', updateActive, { passive: true })

  // IO 2 — sentinelles : --bellow sur item actif + label déco
  const sentinels = Array.from(
    document.querySelectorAll<HTMLElement>('[data-sentinel-for]')
  )

  const sentinelIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.sentinelFor!
        const item = itemMap.get(id)
        const decoLabel = getDecoLabel(id)
        if (!item) continue

        const isActive =
          item.classList.contains('index-nav__item--start') ||
          item.classList.contains('index-nav__item--bellow')
        if (!isActive) continue

        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          item.classList.remove('index-nav__item--start')
          item.classList.add('index-nav__item--bellow')
          decoLabel?.classList.add('section-label-deco--bellow')
        } else if (entry.isIntersecting) {
          item.classList.remove('index-nav__item--bellow')
          item.classList.add('index-nav__item--start')
          decoLabel?.classList.remove('section-label-deco--bellow')
        }
      }
    },
    { root: main, rootMargin: '-1px 0px 0px 0px', threshold: 0 }
  )

  sentinels.forEach((el) => sentinelIO.observe(el))

  // Init : calcul immédiat (gère aussi un rechargement en milieu de page)
  updateActive()
}

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
