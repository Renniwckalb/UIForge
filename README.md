# UI Forge

Studio visuel pour créer, configurer, personnaliser, prévisualiser et exporter des composants React réutilisables, en s'appuyant sur des bibliothèques réellement installées.

Licence : **MIT** (voir [LICENSE](./LICENSE) et l'inventaire complet [LICENSES.md](./LICENSES.md), aussi visible dans le studio à `/licences`).

| Famille | Bibliothèques | Briques |
| --- | --- | --- |
| Fondations | shadcn/ui (sources copiées par le CLI), Radix UI, Base UI | Conteneur, Grille, Titre, Paragraphe, Bouton, Champ, Zone de texte, Label, Badge, Séparateur, Interrupteur, Case à cocher, Carte, Dialogue, Section repliable (Radix), Infobulle et Popover (Base UI) |
| Spécialistes | Base UI Drawer, cmdk, NumberFlow | Drawer, Palette ⌘K, Menu de commandes, Chiffre animé |
| Designés | Magic UI (composants gratuits, MIT) | Bouton scintillant, Cadre à faisceau, Fond à points, Défilement, Mots en rotation, Hero à grille animée, Texte animé |
| Préréglages | [Beautiful UI](https://beautifului.dev) (MIT) | Thème global (palette clair/sombre, Inter + JetBrains Mono, rayons, ombres) et règles d'animation (Comportement › Animation) |

Écartés : **Aceternity UI** (aucune licence publiée pour les composants gratuits, conditions du site interdisant la redistribution) et **Vaul** (déclaré non maintenu par son auteur, remplacé par le Drawer de Base UI). Détails dans LICENSES.md.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000 — fonctionne hors ligne (Monaco et polices servis localement)
```

`dev` et `build` lancent d'abord `vendor:sync` et la génération de l'inventaire des licences ; `build` exécute aussi `licenses:check`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm test` | Tests codegen ↔ parseur : aller-retour TSX/CSS, breakpoints, code conservé, raccourcis, avis de tiers |
| `npx tsx tests/e2e/studio.smoke.mts http://localhost:3000` | Test du studio dans Chromium (Playwright) : glisser-déposer, panneaux, Monaco, mode Interactif, breakpoints, préréglage Beautiful UI, conflit de raccourcis, aucune requête externe |
| `npm run verify:export` | Exporte chaque modèle dans un projet `create-next-app` **vierge**, installe les dépendances du README, `next build`, puis vérifie rendu, Drawer, ⌘K (`shortcut`, `enableShortcut`), NumberFlow, animations du Dialogue, responsive, animations Beautiful UI, `prefers-reduced-motion` et `THIRD_PARTY_NOTICES.md` |
| `npm run verify:js-export` | Exporte chaque modèle en Web Component et le vérifie dans Chromium : page HTML en `file://`, `import` + `mount()`, instances multiples, props (attributs, propriétés, `setProps`), drawer et ⌘K dans le Shadow DOM, enveloppe React, aucune erreur ni requête externe |
| `npm run build:export-runtime` | Compile le rendu serveur de l'export Web Component pour `/api/export` (lancé par `dev` et `build`) |
| `npm run licenses:check` | Échoue si une dépendance a une licence hors liste (MIT, ISC, BSD-2/3-Clause, Apache-2.0, OFL-1.1, 0BSD) sans exception documentée dans `licenses.exceptions.json` |
| `npm run licenses:report` | Régénère LICENSES.md et la page « Licences » |
| `npm run vendor:sync` | Prépare les sources copiées (`src/vendor/ui`) pour l'export |

## Langues

Interface en **anglais** (langue de base), **français** et **chinois** : sélecteur de langue (icône 文A) sur l'accueil, le studio, le dessin et la page Licences. Le choix est mémorisé dans un cookie `locale` et lu côté serveur, donc la page s'affiche directement dans la bonne langue.

- Le code est écrit en anglais : `t("Delete {name}?", { name })` dans les composants (`useT()`), `tr()` hors React. Les traductions sont dans `src/i18n/messages/fr.json` et `zh.json` (clé = texte anglais).
- Les textes par défaut des nouveaux éléments et des modèles, les commentaires du code généré, les messages d'analyse et les fichiers exportés (README, avis de tiers) suivent la langue choisie.
- `npm test` vérifie que chaque texte de l'interface a sa traduction française et chinoise.
- Ajouter une langue : un fichier `messages/<code>.json`, puis l'ajouter dans `LOCALES` et `LOCALE_NAMES` (`src/i18n/core.ts`).

## Agents IA

Un agent IA peut créer des composants sans piloter l'interface :

1. **Format « spec »** : un arbre de briques en JSON (`{ "name": "PricingCard", "children": [{ "brick": "shadcn.card", "texts": { "title": "Pro" } }] }`), converti et validé en modèle complet (`src/forge/spec/spec.ts`). Les erreurs indiquent le chemin JSON (`children[0].props.variant: …`).
2. **Documentation pour agents**, générée depuis le registre des briques et donc toujours à jour : `/llms.txt` (mode d'emploi, briques, tokens, exemples) et `/schema.json` (JSON Schema).
3. **Lien de création** : `/new?spec=<JSON encodé>`, `/new#spec=<JSON | base64url | z.deflate>` ou `/new?src=<url d'un .json>`. La page affiche le composant et ne l'enregistre (IndexedDB du navigateur) qu'après confirmation ; un avertissement apparaît si le modèle contient du code personnalisé.
4. **API sans état** (CORS ouvert, rien n'est stocké) :
   - `POST /api/link` `{ spec }` → lien de création compressé ;
   - `POST /api/export` `{ spec, format: "react" | "web-component", language, locale, output: "json" | "zip" }` → fichiers exportés ou .zip. Les mêmes champs sont acceptés en GET.

L'export Web Component côté serveur a besoin d'un rendu React que Next.js interdit dans les routes : `npm run build:export-runtime` (lancé par `predev` et `prebuild`) le compile à part dans `.forge/web-component-export.mjs`.

## Modèle et synchronisation

Source de vérité unique : le modèle JSON (`ComponentDoc`). Chaque brique est décrite par **un seul gabarit déclaratif** utilisé par le canvas, le générateur de code et le parseur.

- **Styles par breakpoint** : `style.base` (mobile), `style.sm|md|lg|xl`. Le panneau Style édite le breakpoint du viewport actif (mobile = base, tablette = md, desktop = lg) et signale les surcharges. Le code généré utilise des classes Tailwind `md:[padding-inline:var(--space-8)]!`, relues par le parseur.
- **Rien ne disparaît** : classes tapées à la main → `className` du nœud, fusionné par `cn()` (tailwind-merge) ; attributs inconnus, imports, déclarations et instructions inconnus, actions de clic personnalisées → conservés et réécrits tels quels ; JSX non représentable → bloc brut. Tout est listé dans l'onglet Code (« Code conservé hors panneaux »).
- **Raccourcis** : les briques cmdk ont `shortcut` (défaut `"mod+k"`) et `enableShortcut` (défaut `true`), exposées dans l'export. Le studio signale les conflits et propose un raccourci libre.

## Export

```
mon-composant/
  index.tsx | index.jsx       le composant (aucun import du studio)
  styles.css                  tokens, styles, keyframes des primitives utilisées
  ui/…                        sources tierces copiées (shadcn/ui, Magic UI), en-têtes conservés
  README.md                   npm install, usage, props, polices, licences
  THIRD_PARTY_NOTICES.md      uniquement les bibliothèques présentes, texte complet de leur licence
```

Le code généré appartient à son auteur ; seuls les fichiers et extraits tiers restent sous leur licence d'origine.

### Export Web Component (JavaScript)

Dans la fenêtre d'export, le format **Web Component** produit un composant autonome rangé dans son propre dossier,
sans dépendance ni build, à récupérer dans n'importe quelle page principale :

```
mon-composant-js/
  index.html                          page principale de démonstration : <script src="components/…"> + <mon-composant>
  README.md
  components/mon-composant/           ← le dossier à copier dans votre projet
    index.js                          module ES (import) : balisage, styles et comportement
    mon-composant.umd.js              le même composant pour <script src>, require() et AMD (window.UIForge.<Nom>)
    react.js                          composant React (enveloppe, "use client", sans JSX ni Tailwind)
    index.d.ts, react.d.ts            types (props, élément, balise JSX)
    package.json                      main / module / types : import "./components/mon-composant"
    README.md, THIRD_PARTY_NOTICES.md
```

| Contexte | Utilisation |
| --- | --- |
| Page HTML (même en `file://`) | `<script src="components/mon-composant/mon-composant.umd.js"></script>` puis `<mon-composant cta-label="…"></mon-composant>` |
| Module ES / bundler (Vite, webpack…) | `import MonComposant from "./components/mon-composant"; MonComposant.mount("#app", { ctaLabel: "…" })` |
| CommonJS | `const MonComposant = require("./components/mon-composant")` |
| React (Next.js, Vite…) | `import MonComposant from "./components/mon-composant/react"` puis `<MonComposant ctaLabel="…" />` |
| Vue, Svelte, Angular, Astro | importer le dossier, puis `<mon-composant>` |

- **Élément personnalisé à Shadow DOM** : thème, reset et utilitaires Tailwind compilés sont isolés (ni fuite vers la page, ni CSS de la page qui casse le composant). Les `@property` de Tailwind sont déclarées sur le document. Plusieurs instances coexistent, chacune avec ses props et son état.
- **Props** : les mêmes que l'export React, en attributs (`cta-label`, `data-cta-label` ; `data-title` pour les noms d'attributs natifs), en propriétés (`el.ctaLabel = …`), avec `el.setProps({…})` ou `mount(cible, {…})`. Les props qui changent le balisage (variante, taille, désactivé…) sont pré-rendues pour chaque valeur.
- **API** : `el.getProps()`, `el.open(id)` / `close` / `toggle` (dialogue, drawer, palette, popover, section repliable), `el.states`, `el.destroy()`, évènement `uiforge:ready`. Le module se charge sans erreur côté serveur (SSR).
- **Actions « code personnalisé »** : converties en JavaScript (sucrase) et exécutées dans une portée qui reproduit celle du composant (états `…Open`/`set…Open`, refs, props, code conservé hors hooks React).

## Dessin SVG

`/dessin` (bouton « Dessin SVG » de l'accueil) : un éditeur vectoriel avec 15 formes (crayon, ligne, flèche, rectangle, carré,
rectangle arrondi, cercle, ellipse, triangle, losange, pentagone, hexagone, étoile, cœur, texte), une gomme, la sélection
(déplacer, redimensionner, premier/arrière-plan, dupliquer), le style (contour, remplissage, épaisseur, opacité, tirets),
la grille aimantée, annuler/rétablir. Le code SVG s'affiche en direct (option « Recadrer » au contenu), se copie et se
télécharge en `.svg` ou `.png`. Le dessin est conservé dans le navigateur (localStorage).
Le modèle et la sérialisation sont dans `src/draw/shapes.ts` : le canvas affiche exactement le balisage du code.

## Architecture

```
src/
  app/                 / (Mes composants), studio/[id], preview (iframe du mode Interactif), licences
  components/ui/       shadcn pour l'interface du studio uniquement
  vendor/ui/           sources des briques (shadcn/ui, Magic UI) — rendues ET exportées
  forge/
    model/             types, opérations pures, schéma zod, modèles de départ
    bricks/            définitions déclaratives (schéma de props + gabarit) et registre
    tokens/            thème par défaut, préréglage Beautiful UI
    codegen/ parser/   modèle ↔ index.tsx / styles.css
    runtime/           rendu (canvas + preview), raccourcis, compilation Tailwind à la volée des classes saisies
    export/            dossier autonome, README, avis de tiers, zip
    licenses/          textes de licence des sources copiées
    store/ persistence/ Zustand (historique) et IndexedDB derrière une interface ComponentRepository
  studio/              UI du studio (barre, briques, calques, canvas, panneaux, Monaco local)
scripts/               vendor-sync, verify-export, licenses
```

## Ajouter une brique

1. `npx shadcn@latest add <composant ou URL de registry> -p src/vendor/ui`, puis `npm run vendor:sync` — vérifier d'abord la licence de la source (aucune dépendance copyleft ou sans licence).
2. Déclarer la brique dans `src/forge/bricks/defs/*.ts` et ses tags dans `src/forge/runtime/components.tsx`.
3. Déclarer son origine dans `ORIGIN` (`scripts/vendor-sync.ts`) et, si nouvelle, sa licence dans `src/forge/licenses/third-party.ts`.
4. `npm test`, `npm run licenses:check`, `npm run verify:export`.
