import '../scss/main.scss'
import { initNav } from './nav.js'
import { initScrollLine, initParallax, initFadeIn } from './animations.js'

document.addEventListener('DOMContentLoaded', () => {
  initNav()
  initScrollLine()
  initParallax()
  initFadeIn()
})
