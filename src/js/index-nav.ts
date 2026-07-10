// Comportement touch du rail index-nav (règles R12–R13).
// Hold 300ms sur un point → label visible (initial).
// Glissement vers un autre point → transfert du hold.
// Glissement sur l'étiquette → pressed.
// Scroll lock pendant le hold (preventDefault sur touchmove).

const HOLD_DELAY = 300

// ─── Scrollspy — machine à états dérivée du scroll ───────────────────────────
// TEST (2026-07) : --actif est retiré ; son trigger (deco croise son propre dot)
// déclenche désormais directement --start (plus de phase intermédiaire invisible).
// --bellow ne dépend plus des sentinelles [data-sentinel-for] : il se déclenche
// dès que la <section> elle-même touche le haut de l'écran (sectionTop ≤ 0).
//
// Quatre états, franchis dans l'ordre au scroll descendant (réversibles à la
// remontée puisque l'état est *dérivé* chaque frame, pas accumulé) :
//
//   collapse-before → start → bellow → collapse-after
//
//   • collapse-before : jamais atteint — grande taille, hidden, position défaut
//   • start           : deco croise son miroir (dot) — visible, grande, à 10px
//   • bellow          : la <section> touche le haut de l'écran — petit, visible
//   • collapse-after  : la section *suivante* atteint --start — petit, hidden
//
// La deco se masque juste après le passage collapse-before → start (cf. deco-hide
// plus bas, retimé sur ce même trigger + un court délai de scroll).

const enum Stage { Before, Start, Bellow, After }

const STAGE_CLASS = [
  'index-nav__item--collapse-before',
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
    section: document.getElementById(item.dataset.section!), // <section> réelle — trigger bellow
    dot: item.querySelector<HTMLElement>('.index-nav__dot-core'), // @dot-pad — le rond visuel (pas l'enveloppe paddée) pour le trigger --start
    decoLabel: document.querySelector<HTMLElement>(`[data-label-for="${item.dataset.section}"]`),
    // scrollTop au moment où l'item passe --start ; null tant que non atteint.
    startScrollTop: null as number | null,
  }))

  // La deco est masquée N px de scroll APRÈS le passage collapse-before → start.
  const DECO_HIDE_AFTER_START_PX = 2

  // Ligne du rail en coordonnées viewport (= où les labels DOCKÉS s'alignent et où
  // la deco vient réellement se coller). getBoundingClientRect renvoie du
  // viewport-relatif, donc on lit le `top` résolu de .index-nav — pas le `top:10px`
  // de la deco, qui est relatif à `main` (décalé de nav-height).
  const stickyTopPx = (() => {
    const nav = document.querySelector<HTMLElement>('.index-nav')
    return nav ? parseFloat(getComputedStyle(nav).top) : 10
  })()

  // La <section> a « touché le haut de l'écran » = trigger de --bellow (remplace
  // le franchissement d'une sentinelle [data-sentinel-for] — laissé de côté pour ce test).
  function isSectionAtTop(entry: (typeof sectionEntries)[number]) {
    return entry.section ? entry.section.getBoundingClientRect().top <= 0 : false
  }

  // La deco d'une section a « croisé son miroir » = trigger de --start (REVEAL).
  // (decoTop passe au-dessus du dot de sa propre entrée dans le rail).
  function isStart(entry: (typeof sectionEntries)[number]) {
    if (!entry.decoLabel || !entry.dot) return false
    return entry.decoLabel.getBoundingClientRect().top <= entry.dot.getBoundingClientRect().top + 1
  }

  // La deco a atteint son point de collage réel = trigger du DOCKING (translate
  // vers le haut). Distinct du reveal (isStart) : le rôle que jouait l'ex --actif
  // (item déjà visible/grand mais pas encore migré en haut) est repris ici — le
  // label apparaît d'abord à SA position naturelle, puis migre en haut au fil du
  // scroll jusqu'à ce point. Sans deco (coworking) : toujours docké (offset ≈ 0).
  function isDocked(entry: (typeof sectionEntries)[number]) {
    if (!entry.decoLabel) return true
    return entry.decoLabel.getBoundingClientRect().top <= stickyTopPx + 1.5
  }

  // Dot du DERNIER item du rail — repère fixe (une fois le rail docké) pour le
  // nouveau trigger de disparition de l'item PRÉCÉDENT. La deco entrante descend
  // vers le haut de l'écran et croise ce dot (le plus bas de la liste) bien AVANT
  // d'atteindre son propre miroir → déclenchement plus précoce que isStart(next).
  const lastDot = sectionEntries[sectionEntries.length - 1]?.dot

  function crossedLastDot(entry: (typeof sectionEntries)[number]) {
    if (!entry.decoLabel || !lastDot) return false
    return entry.decoLabel.getBoundingClientRect().top <= lastDot.getBoundingClientRect().top + 1
  }

  function stageOf(i: number): Stage {
    const entry = sectionEntries[i]
    const next = sectionEntries[i + 1]

    // collapse-after : dès que la deco de la section suivante croise le dot du
    // DERNIER item de la liste (et non plus son propre miroir) — avancé dans la
    // timeline pour que l'item précédent disparaisse plus tôt.
    if (next && crossedLastDot(next)) return Stage.After
    // bellow : la section elle-même touche le haut de l'écran.
    if (isSectionAtTop(entry)) return Stage.Bellow

    // Pas encore franchi : coworking (sans deco) démarre directement en start.
    if (!entry.decoLabel || !entry.dot) return Stage.Start

    if (isStart(entry)) return Stage.Start   // deco a croisé son miroir
    return Stage.Before
  }

  function updateScrollspy() {
    const scrollTop = main.scrollTop
    const stages = sectionEntries.map((_, i) => stageOf(i))

    sectionEntries.forEach((entry, i) => {
      const stage = stages[i]
      const { item, decoLabel } = entry

      if (!item.classList.contains(STAGE_CLASS[stage])) {
        item.classList.remove(...STAGE_CLASS)
        item.classList.add(STAGE_CLASS[stage])
      }
      item.toggleAttribute('aria-current', stage === Stage.Start)

      // Deco masquée peu après le passage collapse-before → start. isStart() n'est
      // pas figé (contrairement à l'ancien repère "sticky"), donc on mémorise le
      // scrollTop du franchissement puis on masque +N px plus loin. Réversible :
      // si l'item redescend sous --start (remontée), on ré-arme.
      if (decoLabel) {
        if (isStart(entry)) {
          if (entry.startScrollTop === null) entry.startScrollTop = scrollTop
        } else {
          entry.startScrollTop = null
        }
        const hidden = entry.startScrollTop !== null &&
          scrollTop >= entry.startScrollTop + DECO_HIDE_AFTER_START_PX
        decoLabel.classList.toggle('index-nav__deco--hidden', hidden)
      }
    })

    // Après application des états (donc des hauteurs courantes) : recale les offsets.
    calcLabelOffsets()

    // Tant qu'un item --start n'est pas encore DOCKÉ (deco pas encore à son point de
    // collage), on neutralise son offset : il reste visible à SA position naturelle
    // plutôt que de sauter instantanément en haut. Il migre vers le haut au fil du
    // scroll dès que isDocked() devient vrai (recalculé chaque frame par calcLabelOffsets).
    sectionEntries.forEach((entry, i) => {
      if (stages[i] === Stage.Start && !isDocked(entry)) {
        entry.item.style.setProperty('--label-to-first', '0px')
      }
    })
  }

  main.addEventListener('scroll', updateScrollspy, { passive: true })
  new ResizeObserver(updateScrollspy).observe(document.documentElement)
  updateScrollspy()
}

export function initIndexNavTouch(root: ParentNode = document) {
  // Tous les items du rail (pas seulement --collapsed) : le scrollspy vivant ne pose
  // plus cette classe depuis le passage au modèle à 4 stades (collapse-before / start /
  // bellow / collapse-after) — cf. note PLAN-ACTION « Mobile touch-and-hold (dette) ».
  // Miroir du hover desktop (`.index-nav__item:hover .index-nav__label`, IndexNav.astro),
  // qui révèle déjà le label sur n'importe quel stade grâce à sa spécificité plus forte
  // que le `display:none` de masquage — même logique ici via `.is-touch-held`.
  const items = Array.from(root.querySelectorAll<HTMLElement>('.index-nav__item'))
  if (!items.length) return

  let activeEl: HTMLElement | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const clearActive = () => {
    activeEl?.classList.remove('is-touch-held', 'index-nav__item--touch-drag')
    activeEl = null
  }

  const activate = (el: HTMLElement) => {
    if (el === activeEl) return
    clearActive()
    activeEl = el
    el.classList.add('is-touch-held')
  }

  // R13 — navigation (smooth scroll) au relâchement du hold sur l'étiquette dépliée.
  // Jamais implémentée avant (ni desktop ni mobile, cf. note PLAN-ACTION) : le
  // preventDefault appliqué sur touchmove pendant le hold empêche le navigateur de
  // synthétiser le click natif de l'<a href="#id">, donc on déclenche le scroll ici.
  const navigate = (el: HTMLElement) => {
    const id = el.dataset.section
    const target = id ? document.getElementById(id) : null
    if (!target) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const reset = () => {
    if (timer) { clearTimeout(timer); timer = null }
    const pressed = activeEl?.classList.contains('index-nav__item--touch-drag') ? activeEl : null
    clearActive()
    if (pressed) navigate(pressed)
  }

  items.forEach((el) => {
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
        const hovered = items.find(
          (item) => item === target || item.contains(target)
        )
        if (hovered && hovered !== activeEl) {
          if (timer) { clearTimeout(timer); timer = null }
          activate(hovered)
        }
      }

      if (activeEl) {
        const label = activeEl.querySelector('.index-nav__label')
        activeEl.classList.toggle('index-nav__item--touch-drag', !!label?.contains(target))
      }
    }, { passive: false })

    el.addEventListener('touchend', reset)
    el.addEventListener('touchcancel', () => {
      if (timer) { clearTimeout(timer); timer = null }
      clearActive()
    })
  })
}
