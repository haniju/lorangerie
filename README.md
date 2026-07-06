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

## Tester sur un téléphone (même wifi)

Pour visualiser le site sur un mobile réel (utile pour le responsive), on expose
le serveur sur le réseau local avec le flag `--host` :

```bash
nvm use 22
npm run dev -- --host
```

Astro affiche alors deux URLs — utiliser celle en `Network:` :

```
Local:   http://localhost:4321/
Network: http://192.168.1.xx:4321/   ← à ouvrir sur le téléphone
```

1. Le téléphone doit être sur **le même wifi** que le Mac.
2. Ouvrir l'URL `Network:` dans le navigateur du téléphone.
3. Au 1ᵉʳ lancement, macOS peut demander d'**autoriser** `node` à accepter les
   connexions entrantes → accepter, sinon le téléphone ne joint pas le serveur.

Notes :
- `dev` = **hot reload** (les modifs s'affichent en direct sur le téléphone).
- Pour tester le build de prod (images optimisées) : `npm run build && npm run preview -- --host` (port **4323**).
- Retrouver l'IP du Mac : `ipconfig getifaddr en0` (elle peut changer au redémarrage du wifi/routeur).
- Debug iOS : iPhone en USB → Safari Mac, menu **Développement** → inspecteur web de la page mobile.

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
