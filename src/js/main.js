import '../scss/main.scss'
import { initNav } from './nav.js'
import { initScrollLine, initParallax, initFadeIn } from './animations.js'

document.addEventListener('DOMContentLoaded', async () => {
  initNav()
  initScrollLine()
  initParallax()
  initFadeIn()

  // Init color manager on design-system page only
  if (document.querySelector('.ds-colors')) {
    const { initColors } = await import('./colors/index.js')
    await initColors()
  }
})
