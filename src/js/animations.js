import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initScrollLine() {
  const progress = document.querySelector('.scroll-line__progress')
  if (!progress) return

  gsap.to(progress, {
    height: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
    },
  })
}

export function initParallax() {
  const elements = document.querySelectorAll('[data-parallax]')

  elements.forEach(el => {
    const speed = parseFloat(el.dataset.parallax) || 0.2

    gsap.to(el, {
      yPercent: speed * -100,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })
  })
}

export function initFadeIn() {
  const elements = document.querySelectorAll('[data-fade-in]')

  elements.forEach(el => {
    gsap.from(el, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
    })
  })
}
