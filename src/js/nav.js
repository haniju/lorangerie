export function initNav() {
  const toggle = document.querySelector('.site-nav__toggle')
  const links = document.querySelector('.site-nav__links')

  if (!toggle || !links) return

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is-open')
    links.classList.toggle('is-open')
  })

  // Close nav on link click (mobile)
  links.querySelectorAll('.site-nav__link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('is-open')
      links.classList.remove('is-open')
    })
  })
}
