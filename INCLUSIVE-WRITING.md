# INCLUSIVE-WRITING.md

> Spec de l'écriture inclusive pour L'Orangerie. Source : travail Figma/conception.
> À appliquer au pipeline contenu (`textes.json` via `figma-to-content.js`) et aux
> composants qui rendent du texte. Ce document fait foi ; PLAN-ACTION y renvoie.

---

## Objectif

Le contenu du site utilise l'écriture inclusive, mais de façon **incohérente** : trois
modalités coexistent dans `textes.json`. Il faut **unifier sur une seule modalité visuelle**
(le point médian) et **fournir une forme accessible** aux lecteurs d'écran, car le point
médian se prononce mal (voire pas du tout, ou « point ») en synthèse vocale.

Deux exigences distinctes, à ne pas confondre :
1. **Uniformité visuelle** — tout le texte affiché utilise le point médian `·` (U+00B7).
2. **Accessibilité** — chaque mot inclusif expose une forme orale correcte aux lecteurs
   d'écran, sans casser l'affichage.

---

## 1. Les trois modalités présentes (état des lieux)

Le contenu réel mélange trois séparateurs. Occurrences relevées dans `textes.json` :

| Modalité | Exemples réels | Décision |
|---|---|---|
| **Point médian `·`** (U+00B7) | `adhérent·e·s` | **Forme cible** — tout doit converger ici |
| **Point `.`** | `entrepreneur.e.s`, `habitant.e.s`, `Copulpeur.euse`, `fait.e` | À convertir vers `·` |
| **Tiret `-`** | `humain-es` | À convertir vers `·` — **MAIS attention aux faux positifs** |

> **4e modalité à surveiller : les parenthèses `(e)`** (ex. `étudiant(e)s`). Absente de `textes.json` aujourd'hui, mais classique — la détection doit la reconnaître si le contenu évolue.

### Le glyphe exact

- Caractère cible : **point médian `·` = U+00B7** (MIDDLE DOT).
- **Ne pas** utiliser : U+2022 (`•` bullet), U+2027 (`‧` hyphenation point), U+00B7 est le seul correct.
- Un seul point médian entre le radical et le suffixe. Pour un pluriel, on peut avoir deux points
  médians : `adhérent·e·s` (radical · suffixe genre · marque du pluriel). Conserver le motif
  d'origine, ne pas simplifier `adhérent·e·s` en `adhérent·es`.

---

## 2. Détection fine (le piège du tiret)

La conversion point `.` → `·` et tiret `-` → `·` ne peut PAS être un simple rechercher-remplacer :
le point et le tiret ont des usages parfaitement normaux qui NE sont PAS de l'écriture inclusive.

### Faux positifs à NE JAMAIS convertir

**Tiret** (le plus piégeux) :
- mots composés : `tiers-lieu`, `open-space`, `rez-de-chaussée`, `week-end`
- inversions verbe-sujet : `Suis-je`, `est-ce`, `peut-on`
- impératifs avec pronom : `contacte-nous`, `rejoins-nous`, `vas-y`
- noms propres / marques composés

**Point** :
- fins de phrase, abréviations (`etc.`, `M.`, `réf.`), URLs, décimales, `...`

### Heuristique de détection inclusive

Un séparateur est **inclusif** (donc à convertir) seulement si le motif ressemble à
`radical + séparateur + suffixe de genre [+ séparateur + marque de pluriel]`, où le suffixe
appartient à un ensemble fermé de terminaisons inclusives :

```
suffixes de genre inclusifs (liste blanche) :
  e, es, se, ses, ère, ères, euse, euses, rice, rices, trice, trices,
  ne, nes, le, les, ale, ales, ive, ives, f, ve, ...
```

Règle pratique de détection : `\p{L}+[·.\-](e|es|se|ère|ères|euse|euses|rice|rices|ne|nes|le|les|...)(?:[·.\-]s)?\b`
appliqué avec la liste blanche des suffixes, ET en excluant explicitement la liste des
faux-positifs ci-dessus (mots composés, inversions, impératifs).

**Principe de prudence** : en cas de doute, NE PAS convertir automatiquement. Mieux vaut
produire un **rapport avant/après** (voir §4) que je valide à la main, qu'une conversion
silencieuse qui corrompt `tiers-lieu` en `tiers·lieu`.

**Implémentation** :
- Ordonner la liste blanche de suffixes **du plus long au plus court** dans l'alternance regex (`es` avant `e`, `ères` avant `ère`), sinon un mot comme `humain·es` matche mal.
- **Idempotence** : ré-exécuter la conversion sur du contenu déjà unifié ne doit rien modifier (un point médian reste un point médian).

---

## 3. La couche accessibilité (aria / sr-only)

Le point médian affiché ne doit jamais être lu tel quel par un lecteur d'écran. Deux
stratégies possibles ; **choisir la stratégie B par défaut** (meilleur support).

### Stratégie A — forme orale via aria-label (simple, à réserver aux cas isolés)

```html
<span aria-label="adhérentes et adhérents">adhérent·e·s</span>
```

Le lecteur d'écran lit le `aria-label`, ignore le contenu visible. Limite : verbeux à écrire,
et le contenu visible reste sélectionnable tel quel.

### Stratégie B — forme visible + forme orale masquée (recommandée)

Le mot affiche le point médian pour les voyants ; une forme « pleine » en `sr-only` est lue
par les lecteurs d'écran ; la forme visible est masquée à l'oral via `aria-hidden`.

```html
<span class="incl">
  <span aria-hidden="true">adhérent·e·s</span>
  <span class="sr-only">adhérentes et adhérents</span>
</span>
```

Avec le `sr-only` standard :

```scss
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

### Contraintes de la stratégie B

- **Copier-coller** : sélectionner le mot copie les **deux** formes (`adhérent·e·sadhérentes et adhérents`). Neutraliser avec `user-select: none` sur le `.sr-only`.
- **`lang="fr"`** obligatoire sur `<html>` (et sur tout bloc d'une autre langue) : sans lui, une voix de synthèse anglaise prononce mal les formes développées.
- **SEO / GEO** : `aria-hidden` masque de l'arbre d'accessibilité, **pas du DOM**. Les crawlers (moteurs classiques et génératifs) lisent les deux chaînes et récupèrent donc la forme lisible « adhérentes et adhérents » — bénéfique. Rendu **build-time** (Astro) : les `sr-only` sont dans le HTML servi. Vigilance : ne pas laisser la double chaîne être perçue comme du contenu dupliqué.
- **Vérification** : tester sur un lecteur d'écran **réel** (VoiceOver macOS/iOS, NVDA Windows) — le comportement des synthèses vocales n'est pas déterministe ; ne pas se contenter d'inspecter l'arbre d'accessibilité.

### Forme orale = « développée », validée au cas par cas

La forme lue développe le mot en toutes lettres, **féminin puis masculin** (décidé :
féminin d'abord, cohérent avec la démarche inclusive) :

| Affiché | Forme orale (sr-only) |
|---|---|
| `adhérent·e·s` | adhérentes et adhérents |
| `entrepreneur·e·s` | entrepreneuses et entrepreneurs *(à valider : « entrepreneure » ?)* |
| `habitant·e·s` | habitantes et habitants |
| `Copulpeur·euse` | Copulpeuse et Copulpeur *(terme maison — valider la forme)* |
| `humain·es` | humaines et humains |
| `usager·ère·s` | usagères et usagers |
| `fait·e` | faite ou fait *(selon contexte — peut ne pas être un cas inclusif)* |

> Les formes orales marquées *(à valider)* nécessitent une décision humaine (néologismes,
> termes maison, ambiguïtés). Ne pas les générer automatiquement — les remonter dans le
> rapport avant/après.

---

## 4. Livrable de l'étape : le rapport avant/après

`figma-to-content.js` (ou un script dédié `audit-inclusive.js`) produit, en plus du
`textes.json` consommable, un **rapport** listant chaque occurrence détectée :

```
{
  "cle": "fonctionnement.liste.reunion",
  "brut": "adhérent·e·s",
  "modalite": "point-médian",   // point-médian | point | tiret
  "converti": "adhérent·e·s",   // forme point médian unifiée
  "orale": "adhérentes et adhérents",
  "statut": "auto"              // auto | à-valider | faux-positif-ignoré
}
```

Ce rapport est l'**artefact central** : il me permet de valider les cas ambigus avant que la
conversion ne soit appliquée au contenu réel. Aucune conversion silencieuse.

---

## 5. Intégration dans le pipeline

```
Figma (variables string)
  → export → src/data/textes.json (brut DTCG)
    → figma-to-content.js  →  textes.json consommable (prose propre, point médian)
       ├─ unifie les modalités inclusives vers le point médian ·
       └─ produit le rapport avant/après → alimente inclusive-lexicon.json (validation humaine)
  → composants : helper <Incl> lit le lexique et rend la structure aria (stratégie B)
```

### Stockage de la forme orale — décidé : lexique centralisé (Option A)

`textes.json` reste de la **prose propre** (point médian, sans forme orale ni markup). Les formes orales validées vivent dans un **lexique dédié** :

```json
// src/data/inclusive-lexicon.json — la « map validée » (token point médian → forme orale)
{
  "adhérent·e·s": "adhérentes et adhérents",
  "habitant·e·s": "habitantes et habitants"
}
```

Au rendu (build Astro), un helper / composant `<Incl>` parcourt le texte, repère les tokens du lexique (avec bornes de mots) et émet le markup stratégie B. Les répétitions d'un même token sont gérées d'office ; chaque forme orale n'est validée **qu'une fois**.

Le **rapport avant/après** (§4) produit les entrées candidates ; tu valides, elles peuplent le lexique. Deux fichiers distincts : le rapport est régénérable (diagnostic), le lexique est curé et versionné (source de vérité des formes orales).

---

## Décisions prises

1. **Ordre des formes orales** : féminin d'abord (« adhérentes et adhérents »).
2. **Termes maison / néologismes** (`Copulpeur·euse`, `entrepreneur·e·s`) : validés.
3. **Stockage de la forme orale** : lexique centralisé `src/data/inclusive-lexicon.json` (Option A, cf. §5).

> Au fil de l'eau : chaque nouveau token voit sa forme orale validée via le rapport avant/après (`statut: à-valider`). Un token détecté qui ne relèverait PAS de l'inclusif se marque simplement `statut: faux-positif-ignoré` — aucune règle spéciale nécessaire (les 7 occurrences actuelles de `textes.json` sont toutes de la vraie écriture inclusive).