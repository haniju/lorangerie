## Système de grille — largeurs des éléments
Ce fichier explique la marche à suivre au début de l'implémentation d'une nouvelle section.
Il sert à éviter les erreurs et aproximations et permet de reproduire efficacement les design figma en utilisant le design system codé ici

**Workflow pour chaque nouvelle section** : avant de coder, demander (ou vérifier dans Figma) :

1. **Largeur de chaque bloc** — combien de colonnes en desktop ? en mobile ? (→ `--grid-col-desktop-X` / `--grid-col-mobile-X`)
2. **Indent de la colonne** — à quelle distance du bord gauche de la section la colonne démarre-t-elle ? (ex. `padding-left: var(--grid-col-desktop-1)`) ; flush gauche = pas d'indent
3. **Décalage des blocs entre eux** — un bloc est-il décalé horizontalement par rapport aux autres ? (ex. liste décalée de `--grid-col-desktop-1` / `--space-20` en mobile)
4. **Overlap vertical** — les blocs se chevauchent-ils ? Si oui, valeur du recouvrement (`margin-top` négatif)
5. **Alignement desktop vs mobile** — même structure ou reflow structurel ?

Si l'une de ces informations manque au moment de démarrer l'implémentation, la demander avant de coder.

**Pattern d'implémentation** : flex-column + `width` via token grille + `margin-top` négatif pour l'overlap. Éviter CSS grid sauf si le layout est réellement bi-dimensionnel (cf. bento).

## Utilisation du système de grille — largeurs des éléments

Les largeurs de blocs sont toujours exprimées via les tokens grille définis dans `src/scss/base/_fluid.scss` :

```
--grid-col-desktop-1 … --grid-col-desktop-7   (grille 7 colonnes)
--grid-col-mobile-1  … --grid-col-mobile-5    (grille 5 colonnes)
```

Ces tokens sont calculés depuis `--grid-useful` (largeur utile de la page = 100vw - marges, plafonné à 1550px).

**Règle** : ne jamais hardcoder une largeur en px/rem sur un bloc de mise en page. Toujours utiliser `width: var(--grid-col-desktop-X)` en desktop et `width: var(--grid-col-mobile-X)` en mobile.

## Ne pas faire