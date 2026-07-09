// Comportement touch du rail index-nav (règles R12–R13).
// Hold 300ms sur un point → label visible (initial).
// Glissement vers un autre point → transfert du hold.
// Glissement sur l'étiquette → pressed.
// Scroll lock pendant le hold (preventDefault sur touchmove).

const HOLD_DELAY = 300

// ─── Scrollspy — machine à états dérivée du scroll ───────────────────────────
// Cinq états par étiquette de rail, franchis dans l'ordre au scroll descendant
// (et réversibles à la remontée puisque l'état est *dérivé*, pas accumulé) :
//
//   collapse-before → actif → start → bellow → collapse-after
//
//   • collapse-before : jamais atteint — grande taille, hidden, position défaut
//   • actif           : deco atteint son miroir (dot) — dot sapin-60, grande, hidden, à 10px
//   • start           : deco collé à 10px — visible (section active)
//   • bellow          : sentinelle de la section franchie — petit, visible
//   • collapse-after  : sentinelle de la section *suivante* franchie — petit, hidden
//
// Chaque frame : on lit la géométrie (deco vs dot, sentinelles) et on recalcule
// le stade de chaque étiquette. La deco est masquée dès que son étiquette
// atteint `bellow`.

const enum Stage { Before, Actif, Start, Bellow, After }

const STAGE_CLASS = [
  'index-nav__item--collapse-before',
  'index-nav__item--actif',
  'index-nav__item--start',
  'index-nav__item--bellow',
  'index-nav__item--collapse-after',
]

export function initIndexNavScrollspy() {
  const main = document.querySelector<HTMLElement>('main')
  if (!main) return

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
  if (!items.length) return

  // ── Calcul de --label-to-first pour chaque item ──────────────────
  // Offset translateY qui ramène le label de l'item N à la position Y de l'item 1.
  // Les hauteurs du rail changent au fil du scroll (grande ↔ petite selon l'état),
  // donc cet offset n'est PAS invariant : on le recalcule à chaque frame, après avoir
  // appliqué les classes d'état (le transform du label n'affecte pas la boîte de l'item mesurée).
  function calcLabelOffsets() {
    const firstTop = items[0].getBoundingClientRect().top
    items.forEach((item) => {
      const offset = firstTop - item.getBoundingClientRect().top
      item.style.setProperty('--label-to-first', `${offset}px`)
    })
  }

  // ── Entrées de section (ordre DOM = ordre du rail) ───────────────
  const sectionEntries = items.map((item) => ({
    id: item.dataset.section!,
    item,
    dot: item.querySelector<HTMLElement>('.index-nav__dot'),
    decoLabel: document.querySelector<HTMLElement>(`[data-label-for="${item.dataset.section}"]`),
    sentinel: document.querySelector<HTMLElement>(`[data-sentinel-for="${item.dataset.section}"]`),
  }))

  // Ligne du rail en coordonnées viewport (= où les labels dockés s'alignent et
  // où la deco vient se coller). getBoundingClientRect renvoie du viewport-relatif,
  // donc on lit le `top` résolu de .index-nav (calc(nav-height + space-10)) — et NON
  // le `top:10px` de la deco, qui est relatif à `main` (décalé de nav-height).
  const stickyTopPx = (() => {
    const nav = document.querySelector<HTMLElement>('.index-nav')
    return nav ? parseFloat(getComputedStyle(nav).top) : 10
  })()

  // Une sentinelle est « franchie » quand elle passe au-dessus de la ligne du rail.
  function passed(entry: (typeof sectionEntries)[number]) {
    return entry.sentinel
      ? entry.sentinel.getBoundingClientRect().top <= stickyTopPx
      : false
  }

  function stageOf(i: number): Stage {
    const entry = sectionEntries[i]
    const next = sectionEntries[i + 1]

    if (next && passed(next)) return Stage.After
    if (passed(entry)) return Stage.Bellow

    // Pas encore franchi : coworking (sans deco) démarre actif → start.
    if (!entry.decoLabel || !entry.dot) return Stage.Start

    const decoTop = entry.decoLabel.getBoundingClientRect().top
    const dotTop  = entry.dot.getBoundingClientRect().top
    if (decoTop <= stickyTopPx + 1.5) return Stage.Start   // collé à la ligne du rail
    if (decoTop <= dotTop + 1)        return Stage.Actif   // a atteint son miroir
    return Stage.Before
  }

  function updateScrollspy() {
    sectionEntries.forEach((entry, i) => {
      const stage = stageOf(i)
      const { item, decoLabel } = entry

      if (!item.classList.contains(STAGE_CLASS[stage])) {
        item.classList.remove(...STAGE_CLASS)
        item.classList.add(STAGE_CLASS[stage])
      }
      item.toggleAttribute('aria-current', stage === Stage.Start)

      // Deco masqué dès que l'étiquette passe en bellow (la relève est faite).
      decoLabel?.classList.toggle('index-nav__deco--hidden', stage >= Stage.Bellow)
    })

    // Après application des états (donc des hauteurs courantes) : recale les offsets.
    calcLabelOffsets()
  }

  main.addEventListener('scroll', updateScrollspy, { passive: true })
  new ResizeObserver(updateScrollspy).observe(document.documentElement)
  updateScrollspy()
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
