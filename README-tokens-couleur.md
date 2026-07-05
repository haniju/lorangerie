# Pipeline de tokens couleur (Figma-first)

Les couleurs du site proviennent d'une **source de vérité unique : Figma**. Elles ne sont jamais écrites à la main dans le code — elles sont exportées depuis Figma, puis transformées et générées automatiquement.

## Flux

```
Figma (variables couleur)
  └─ plugin "Text & Variable Usage" (export)
       └─ src/data/tokens.colors.json      ← export brut Figma (source)
            └─ scripts/figma-to-colors.js  ← transform
                 └─ src/data/colors.json   ← généré ({groups, tints}) — NE PAS ÉDITER
                      ├─ scripts/generate-tokens.js → src/scss/base/_tokens.scss
                      └─ design-system.html (visualisation)
```

Deux fichiers, deux rôles :

- **`tokens.colors.json`** — l'export Figma brut. Chaque variable porte son `name`, son `id` Figma (stable), sa `collection`, sa valeur résolue (`value`) et, si c'est un token aliasé, le nom de la primitive `_base` (`alias`).
- **`colors.json`** — **fichier généré**, au schéma `{groups, tints}` attendu par le reste de l'outillage. Il est écrasé à chaque transform ; l'en-tête `"_source": "figma"` le signale. Ne pas l'éditer à la main.

## Mettre à jour les couleurs

1. **Dans Figma** : modifier les variables couleur (collections `_base` / `tokens`).
2. **Exporter** : lancer le plugin *Text & Variable Usage* → onglet **Couleurs** → **Export JSON**. Déposer le fichier téléchargé dans `src/data/tokens.colors.json`.
3. **Régénérer** :

   ```bash
   npm run tokens:colors
   ```

   Cela régénère `src/data/colors.json`, puis `src/scss/base/_tokens.scss` dans la foulée.

Script à déclarer dans `package.json` :

```json
"scripts": {
  "tokens:colors": "node scripts/figma-to-colors.js"
}
```

## Conventions de génération

- **Nom → custom property** : les `/` et espaces deviennent des tirets.
  `sable/05` → `--sable-05`, `action/button-primary/initial` → `--action-button-primary-initial`.
- **Groupe** : premier segment du chemin. `sable/05` → groupe `sable`.
- **Valeur** : hex résolu (les alias `_base` sont suivis à l'export, `value` est la couleur finale).
- **Champs conservés pour info** : `collection` et `alias` (la primitive `_base` d'origine) sont gardés dans chaque tint — inertes pour la génération SCSS, exploitables pour enrichir le display.

## Renommage & propagation

Le transform utilise l'**`id` Figma** (stable) comme identifiant de tint. Conséquence : renommer une variable dans Figma est détecté comme un **renommage** (et non suppression + ajout), ce qui permet à la propagation SCSS (`vite-plugin-colors.js`) de réécrire les `var(--ancien)` en `var(--nouveau)` dans les fichiers `.scss`.

> **Migration initiale** : si le SCSS existant utilise d'autres conventions de nommage que celles générées ci-dessus, un réalignement unique est nécessaire — c'est le rôle des fonctions de remplacement de `vite-plugin-colors.js`. Une fois ce passage fait, tout est cohérent.

## À ne pas faire

- ❌ Éditer `colors.json` ou `_tokens.scss` à la main (écrasés à la génération).
- ❌ Écrire un hex en dur dans le SCSS (utiliser `var(--…)` ; le plugin repère les couleurs en dur via l'onglet Couleurs → « En dur »).
- ❌ Ajouter une couleur ailleurs que dans Figma.
