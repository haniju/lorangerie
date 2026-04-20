# L'Orangerie

Site statique vitrine — design system first.

## Stack

- **Vite** — build & dev server
- **SCSS** — styles, tokens, composants
- **GSAP + ScrollTrigger** — animations (parallaxe, scroll line, fade-in)
- **Utopia** — fluid type & space scale (360px → 1240px)
- **s3cmd** — déploiement S3-compatible (IndieHosters)

## Fonts

- **Ortica Linear** (Light / Regular / Bold) — headings
- **DM Sans** (variable) — body

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero titre + texte + CTA |
| Contact | `/contact.html` | Formulaire classique |
| Design System | `/design-system.html` | Couleurs, typo, boutons, blocs texte, tableau |

## Commandes

```bash
npm run dev       # Serveur de développement
npm run build     # Build production → dist/
npm run preview   # Preview du build local
npm run deploy    # Build + déploiement S3
```

## Déploiement

Prérequis : `brew install s3cmd`

Créer un fichier `.env` à la racine (voir `.env.example`) :

```
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...
S3_ENDPOINT=...
```

Puis `npm run deploy`.

## Structure

```
src/
├── assets/font/        # Ortica Linear, DM Sans
├── data/               # JSON contenu (home, contact, design-system, nav)
├── js/                 # main.js, nav.js, animations.js
└── scss/
    ├── base/           # fonts, tokens, reset, typography
    ├── components/     # buttons, table, form, scroll-line
    ├── layout/         # nav, footer
    ├── pages/          # home, contact, design-system
    └── utilities/      # grid, container, flow
```
