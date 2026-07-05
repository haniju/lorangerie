# CLAUDE.md

## Projet

Site statique vitrine "L'Orangerie". Approche design system first — le DS est la fondation, les pages s'appuient dessus.

## Stack & conventions

- **Astro** pour le build (site statique → `dist/`) — tourne sur Vite, donc les plugins Vite restent branchés via `astro.config` → `vite.plugins`. Composants `.astro`, routing par fichiers (`src/pages/`), layouts partagés (navbar + footer uniques).
- **SCSS** organisé en `base/`, `components/`, `layout/`, `pages/`, `utilities/`
- **Utopia** pour le fluid sizing — ne jamais hardcoder des tailles de typo ou d'espacement en px/rem fixes. Utiliser les tokens `--step-*` et `--space-*`. Contenu plafonné à 1550px + marges fluides (bornes 440 / 1280).
- **Couleurs Figma-first** : Figma = seule source → `src/data/tokens.colors.json` (arbre profond) → `scripts/figma-to-colors.js` → `src/data/colors.json` (**généré, ne pas éditer**) → `scripts/generate-tokens.js` → `_tokens.scss`. Voir `README-tokens-couleur.md`.
- **GSAP + ScrollTrigger** pour les animations. Attributs data : `data-fade-in`, `data-parallax="0.2"`. `prefers-reduced-motion` respecté partout.
- **Contenu texte** : source Figma → `src/data/textes.json` (transform `scripts/figma-to-content.js`, à créer), consommé par les composants — jamais en dur dans le HTML.
- **Fonts** (dans `src/assets/font/`) : **iCiel Cadena** (logotype `display`, fichier `iciel Cadena.ttf`), **Ortica Linear** (headings), **DM Sans** variable (body).

## Design

- Direction : léché, discret mais solide. Niveau design engineer
- Palette : neutre `sable` + familles brand `citron`, `sapin`/`sapin_bis`, `pêche` — définie **Figma-first**, générée dans `_tokens.scss` (ne jamais y écrire de hex en dur)
- 2 fonts, 3 niveaux de titres (h1/h2/h3), 2 blocs texte (body/highlight), 3 boutons (filled/outlined/link)
- Responsive mobile-first, 4 breakpoints : mobile / tablet / small desktop / large desktop

## Déploiement

- S3-compatible (IndieHosters, endpoint `hot-objects.liiib.re`)
- Outil : `s3cmd` (pas aws-cli)
- `npm run deploy` = build + sync
- Note : certificat SSL de l'endpoint expiré — `--no-check-certificate` actif en attendant le renouvellement côté hébergeur

## Commandes

```
npm run dev            # Dev server (Astro)
npm run build          # Build statique → dist/
npm run deploy         # Build + deploy S3
npm run tokens:colors  # Régénère colors.json + _tokens.scss depuis tokens.colors.json
```

## Ne pas faire

- Ne pas commiter `.env` ni les fichiers `.rtf` (clés S3 dedans)
- Ne pas retirer `--no-check-certificate` du script deploy tant que le certificat n'est pas renouvelé
- Ne pas utiliser de tailles fixes — toujours passer par les tokens Utopia
- Ne pas éditer `colors.json` ni `_tokens.scss` à la main (générés depuis Figma) — passer par Figma puis `npm run tokens:colors`
- Produit B (`design-system.html` / `color-manager.js`) est **gelé** sur ce projet : ne pas l'utiliser comme éditeur de couleurs
