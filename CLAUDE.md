# CLAUDE.md

## Projet

Site statique vitrine "L'Orangerie". Approche design system first — le DS est la fondation, les pages s'appuient dessus.

## Stack & conventions

- **Vite** pour le build, pas de framework JS
- **SCSS** organisé en `base/`, `components/`, `layout/`, `pages/`, `utilities/`
- **Utopia** pour le fluid sizing — ne jamais hardcoder des tailles de typo ou d'espacement en px/rem fixes. Utiliser les tokens `--step-*` et `--space-*`
- **GSAP + ScrollTrigger** pour les animations. Attributs data : `data-fade-in`, `data-parallax="0.2"`
- **Contenu texte** stocké dans `src/data/*.json`, pas en dur dans le HTML
- **Fonts** : Ortica Linear (headings), DM Sans variable (body). Fichiers dans `src/assets/font/`

## Design

- Direction : léché, discret mais solide. Niveau design engineer
- Palette : 3 gris de fond + 5 couleurs brand (orange, yellow, green, teal, red) définis dans `_tokens.scss`
- 2 fonts, 3 niveaux de titres (h1/h2/h3), 2 blocs texte (body/highlight), 3 boutons (filled/outlined/link)
- Responsive mobile-first, 4 breakpoints : mobile / tablet / small desktop / large desktop

## Déploiement

- S3-compatible (IndieHosters, endpoint `hot-objects.liiib.re`)
- Outil : `s3cmd` (pas aws-cli)
- `npm run deploy` = build + sync
- Note : certificat SSL de l'endpoint expiré — `--no-check-certificate` actif en attendant le renouvellement côté hébergeur

## Commandes

```
npm run dev       # Dev server
npm run build     # Build → dist/
npm run deploy    # Build + deploy S3
```

## Ne pas faire

- Ne pas commiter `.env` ni les fichiers `.rtf` (clés S3 dedans)
- Ne pas retirer `--no-check-certificate` du script deploy tant que le certificat n'est pas renouvelé
- Ne pas utiliser de tailles fixes — toujours passer par les tokens Utopia
