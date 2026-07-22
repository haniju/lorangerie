// Comportement touch du rail index-nav (règles R12–R13).
// Hold 300ms sur un point → label visible (initial).
// Glissement vers un autre point → transfert du hold.
// Glissement sur l'étiquette → pressed.
// Scroll lock pendant le hold (preventDefault sur touchmove).

const HOLD_DELAY = 300

// ─── Scrollspy — machine à états dérivée du scroll ───────────────────────────
// Cinq stades (retour à la spec d'origine — le raccourci à 4 stades testé sur
// la branche `index` supprimait la fenêtre invisible entre T2 et T4, qui est ce
// qui permettait à --label-to-first de se positionner en silence avant reveal) :
//
//   collapse-before → actif → start → bellow → collapse-after
//
// Triggers, avec correspondance à la numérotation de la spec :
//
//   T1 (sentinel after)   : sentinel "175px après T3" (deco de la section SUIVANTE)
//                            atteint stickyTopPx → item courant : bellow → collapse-after
//   T2 (miroir / dot)     : deco croise son propre dot dans le rail
//                            → item : collapse-before → actif (caché, se positionne en silence)
//   T3 (docking)          : deco atteint stickyTopPx — pas un stade, sert de
//                            ligne de référence pour T1/T4/T5 (sentinels)
//   T4 (sentinel start)   : sentinel "+20px après T3" atteint stickyTopPx
//                            → item : actif → start (reveal) ; deco masqué dès cet instant
//   T5 (sentinel bellow)  : sentinel "+50px après T4" (70px cumulé) atteint stickyTopPx
//                            → item : start → bellow
//
// Réversible à la remontée par construction : tout est dérivé de la géométrie
// live à chaque frame, sans exception — T1 est passé d'un repère mouvant
// (nav.bottom, qui dépendait de la hauteur cumulée de TOUS les items du rail,
// nécessitant un verrouillage anti-boucle) à un sentinel à offset fixe, comme
// T4/T5. Plus de scrollTop à mémoriser nulle part dans ce fichier.

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

  const nav = document.querySelector<HTMLElement>('.index-nav')

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
  if (!items.length) return

  // ── Calcul de --label-to-first pour chaque item ──────────────────
  // Offset translateY qui ramène le label de l'item N à la position Y de l'item 1.
  // Les hauteurs du rail changent au fil du scroll (grande ↔ petite selon l'état),
  // donc cet offset n'est PAS invariant : on le recalcule à chaque frame, après avoir
  // appliqué les classes d'état (le transform du label n'affecte pas la boîte de l'item mesurée).
  //
  // LABEL_TOP_INSET (5px) — chaque hauteur d'item (`_index-nav.scss`,
  // `height: calc(Npx + 10px)`) ajoute 10px de plus que la hauteur réelle du label ;
  // centré via `align-items: center`, le label se retrouve donc systématiquement à
  // 10px/2 = 5px sous le haut de SON PROPRE item, quel que soit l'état (start/bellow
  // suivent la même convention +10px). La cible du docking est le haut BRUT de la
  // boîte de items[0] (son label peut être caché, non mesurable — on ne peut ancrer
  // que sur sa boîte) : sans retrancher cet inset, le label docké atterrit 5px plus
  // bas que ce haut de boîte (l'inset de son PROPRE centrage s'ajoute après coup, au
  // lieu de s'annuler avec un inset équivalent côté ancrage).
  const LABEL_TOP_INSET = 5

  function calcLabelOffsets() {
    const firstTop = items[0].getBoundingClientRect().top
    items.forEach((item) => {
      const offset = firstTop - item.getBoundingClientRect().top
      item.style.setProperty('--label-to-first', `${offset}px`)
    })
  }

  // ── Entrées de section (ordre DOM = ordre du rail) ───────────────
  const sectionEntries = items.map((item) => {
    const decoLabel = document.querySelector<HTMLElement>(`[data-label-for="${item.dataset.section}"]`)
    if (!decoLabel) {
      console.warn(`[index-nav] pas de deco pour "${item.dataset.section}" — l'item restera bloqué en --start (cf. index-nav.ts, fallback dans stageOf)`)
    }
    return {
      id: item.dataset.section!,
      item,
      decoLabel,
      sentinelStart: document.querySelector<HTMLElement>(`[data-sentinel-start][data-section-ref="${item.dataset.section}"]`),
      sentinelBellow: document.querySelector<HTMLElement>(`[data-sentinel-bellow][data-section-ref="${item.dataset.section}"]`),
      sentinelAfter: document.querySelector<HTMLElement>(`[data-sentinel-after][data-section-ref="${item.dataset.section}"]`),
    }
  })

  // Ligne du rail en coordonnées viewport (= où les labels DOCKÉS s'alignent et où
  // la deco vient réellement se coller). getBoundingClientRect renvoie du
  // viewport-relatif, donc on lit le `top` résolu de .index-nav — pas le `top`
  // CSS de la deco, qui est relatif à `main` (décalé de nav-height).
  const stickyTopPx = nav ? parseFloat(getComputedStyle(nav).top) : 10

  // T2 — la deco d'une section a « croisé son miroir » dans le rail. Mesuré contre
  // le top de l'item lui-même (pas le dot) : le top d'un item en flex-column ne
  // dépend que de la hauteur cumulée des items AU-DESSUS, jamais de sa propre
  // hauteur — donc immunisé contre le survol, qui fait passer un item encore en
  // collapse-before/after à la hauteur "bellow" (30→45px) sans changer son stage.
  // Le dot, lui, est centré (top:50%) DANS l'item : sa position bouge avec la
  // hauteur de l'item lui-même, donc avec le survol — bruit qu'on veut éviter ici.
  function isActif(entry: (typeof sectionEntries)[number]) {
    if (!entry.decoLabel) return false
    return entry.decoLabel.getBoundingClientRect().top <= entry.item.getBoundingClientRect().top + 1
  }

  // T4/T5 — un sentinel (position fixe par rapport au deco, cf. SCSS) a atteint
  // la ligne du rail. Générique : sert aux deux triggers, seule la cible diffère.
  function crossedSentinel(sentinel: HTMLElement | null) {
    return sentinel ? sentinel.getBoundingClientRect().top <= stickyTopPx : false
  }

  // T1 — sentinel à offset fixe (175px, cf. SCSS --index-after-offset) depuis le
  // deco de la section SUIVANTE, comparé à la même ligne que T4/T5. Remplace
  // l'ancienne mesure de nav.getBoundingClientRect().bottom, qui dépendait de la
  // hauteur cumulée de tous les items du rail — donc bougeait précisément quand
  // CET item changeait de hauteur en réponse à ce même trigger (boucle de
  // rétroaction). Un sentinel à offset fixe n'a plus cette dépendance : plus
  // besoin de verrouiller un scrollTop, la géométrie seule suffit désormais.

  function stageOf(i: number): Stage {
    const entry = sectionEntries[i]
    const next = sectionEntries[i + 1]

    if (next && crossedSentinel(next.sentinelAfter)) return Stage.After // T1

    // Fallback défensif — mort dans les faits si chaque section a désormais un
    // deco (confirmé pour coworking). Cf. explication de son implication à part.
    if (!entry.decoLabel) return Stage.Start

    if (crossedSentinel(entry.sentinelBellow)) return Stage.Bellow // T5
    if (crossedSentinel(entry.sentinelStart)) return Stage.Start   // T4
    // Item 0 : rien ne le précède (coworking suit directement le hero) — pas de
    // vraie fenêtre "avant" à traverser. Sans ce plancher, il reste en
    // collapse-before (25px) jusqu'à ce que son propre T2 se déclenche, ce qui
    // produit un saut de hauteur (25→65px) qui décale les points suivants au
    // moment même où le rail entre à l'écran. Actif dès l'apparition à la place.
    if (i === 0 || isActif(entry)) return Stage.Actif               // T2
    return Stage.Before
  }

  function updateScrollspy() {
    const stages = sectionEntries.map((_, i) => stageOf(i))

    sectionEntries.forEach((entry, i) => {
      const stage = stages[i]
      const { item, decoLabel } = entry

      if (!item.classList.contains(STAGE_CLASS[stage])) {
        item.classList.remove(...STAGE_CLASS)
        item.classList.add(STAGE_CLASS[stage])
      }
      item.toggleAttribute('aria-current', stage === Stage.Start || stage === Stage.Bellow)

      // Deco masqué dès T4 (Start) — dérivé du stage courant, pas de lock séparé :
      // l'ancien verrouillage sur startScrollTop n'était nécessaire que parce que
      // le stage lui-même n'était pas assez précis (4 stades). Avec Actif distinct
      // de Start, ce simple test suffit et reste réversible par construction.
      if (decoLabel) {
        decoLabel.classList.toggle('index-nav__deco--hidden', stage >= Stage.Start)
      }
    })

    // Après application des états (donc des hauteurs courantes) : recale les offsets.
    calcLabelOffsets()
  }

  let scrollTicking = false
  main.addEventListener('scroll', () => {
    if (scrollTicking) return
    scrollTicking = true
    requestAnimationFrame(() => {
      updateScrollspy()
      scrollTicking = false
    })
  }, { passive: true })
  new ResizeObserver(updateScrollspy).observe(document.documentElement)
  updateScrollspy()
}

export function initIndexNavTouch(root: ParentNode = document) {
  // Tous les items du rail (pas seulement --collapsed) : le scrollspy vivant ne pose
  // plus cette classe depuis le passage au modèle à stades (collapse-before / actif /
  // start / bellow / collapse-after) — cf. note PLAN-ACTION « Mobile touch-and-hold (dette) ».
  // Miroir du hover desktop (`.index-nav__item:hover .index-nav__label`, IndexNav.astro),
  // qui révèle déjà le label sur n'importe quel stade grâce à sa spécificité plus forte
  // que le `display:none` de masquage — même logique ici via `.is-touch-held`.
  const items = Array.from(root.querySelectorAll<HTMLElement>('.index-nav__item'))
  if (!items.length) return

  const main = document.querySelector<HTMLElement>('main')

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
  // scrollIntoView({block:'start'}) respecte scroll-margin-top (cf. SCSS,
  // .u-section) — l'atterrissage tombe donc automatiquement sur la
  // ligne de docking (T3), sans offset à dupliquer ici.
  //
  // Le label reste révélé (--nav-pending) pendant tout le trajet du scroll — sans
  // ça, clearActive() (appelé juste avant, dans reset()) retire déjà is-touch-held,
  // et le label disparaîtrait instantanément au lâcher du doigt, avant même que la
  // section ait fini d'arriver. --nav-pending reprend le relais pour la durée du
  // scroll, puis s'efface quelques ms après que celui-ci s'est stabilisé — l'item
  // retombe alors sous le contrôle normal de la state machine (STAGE_CLASS), qui le
  // masque (avant --start) ou le révèle déjà docké (--start atteint) selon le cas :
  // aucune classe supplémentaire à nettoyer nous-mêmes au passage du sentinel-start.
  //
  // Détection de fin de scroll par polling rAF (scrollTop stable sur N frames),
  // PAS par debounce sur l'event 'scroll' : ce dernier dépend de la cadence à
  // laquelle le navigateur choisit de émettre l'event pendant un scroll natif
  // fluide (smooth), qui n'est pas garantie — un scroll déjà terminé avant que
  // le premier event n'arrive, ou des events trop espacés, laissaient
  // --nav-pending posé indéfiniment (jusqu'au prochain scroll MANUEL de
  // l'utilisateur, qui relançait enfin le debounce). Le polling mesure la
  // position réelle à chaque frame, indépendamment de l'event.
  const STABLE_FRAMES = 10 // ~160ms à 60fps sans changement de scrollTop
  const HIDE_DELAY = 200
  const MAX_FRAMES = 300 // ~5s — filet de sécurité si le scroll ne se stabilise jamais

  const navigate = (el: HTMLElement) => {
    const id = el.dataset.section
    const target = id ? document.getElementById(id) : null
    if (!target) return

    el.classList.add('index-nav__item--nav-pending')

    let stableFrames = 0
    let lastScrollTop = -1
    let frames = 0
    function poll() {
      const current = main?.scrollTop ?? 0
      if (Math.abs(current - lastScrollTop) < 0.5) stableFrames++
      else stableFrames = 0
      lastScrollTop = current
      frames++

      if (stableFrames >= STABLE_FRAMES || frames >= MAX_FRAMES) {
        setTimeout(() => el.classList.remove('index-nav__item--nav-pending'), HIDE_DELAY)
      } else {
        requestAnimationFrame(poll)
      }
    }
    requestAnimationFrame(poll)

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

// R15 (accessibilité) — active("clic"/Entrée) sur un point du rail : le saut de
// hash natif (href="#id") scrolle bien la section en vue, mais ne déplace JAMAIS
// le focus clavier/lecteur d'écran dessus si elle n'est pas focusable — la
// navigation séquentielle reprend alors depuis le lien lui-même (rail), pas
// depuis le contenu qu'on vient d'atteindre. Rendu focusable à la volée
// (tabindex="-1" : cible programmatique uniquement, jamais dans l'ordre de tab)
// puis focus() différé pour laisser le jump/scroll natif se produire d'abord.
export function initIndexNavFocus(root: ParentNode = document) {
  const items = root.querySelectorAll<HTMLAnchorElement>('.index-nav__item')
  items.forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.section
      const target = id ? document.getElementById(id) : null
      if (!target) return
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      requestAnimationFrame(() => target.focus({ preventScroll: true }))
    })
  })
}