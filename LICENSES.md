# Licences

UI Forge est publié sous **licence MIT** (fichier [LICENSE](./LICENSE)). Inventaire généré par `npm run licenses:report` le 2026-11-14 ; contrôle : `npm run licenses:check`.

Liste autorisée : MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, OFL-1.1, 0BSD, BlueOak-1.0.0, Zlib, Python-2.0, CC0-1.0, CC-BY-3.0, CC-BY-4.0. Interdites en production (studio et dépendances des exports) : MPL-2.0, MPL-1.1, LGPL-2.1-only, LGPL-2.1-or-later, LGPL-3.0-only, LGPL-3.0-or-later, GPL-2.0-only, GPL-2.0-or-later, GPL-3.0-only, GPL-3.0-or-later, AGPL-3.0-only, AGPL-3.0-or-later.

Aucune dépendance sous GPL/AGPL/LGPL n'a été ajoutée. Le seul composant LGPL présent, `@img/sharp-*` (libvips), est installé par Next.js comme dépendance optionnelle de `next/image` : accepté par le mainteneur, il n'est jamais exécuté (`images.unoptimized: true` dans `next.config.ts`) et n'est jamais inclus dans un composant exporté (vérifié par `licenses:check` et `verify:export`).

## Technologies principales

Licence vérifiée à la source officielle (fichier LICENSE du dépôt ou du paquet publié).

| Technologie | Version | Licence | Copyright | Source | Droits | Remarque |
| --- | --- | --- | --- | --- | --- | --- |
| shadcn/ui | 4.23.0 | MIT | Copyright (c) 2023 shadcn | https://github.com/shadcn-ui/ui/blob/main/LICENSE.md | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. | CLI + sources copiées dans src/vendor/ui et dans les exports |
| Base UI | 1.9.0 | MIT |  | https://github.com/mui/base-ui/blob/master/LICENSE | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| Radix UI | 1.8.1 | MIT |  | https://github.com/radix-ui/primitives/blob/main/LICENSE | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| cmdk | 1.1.1 | MIT | Copyright (c) 2022 Paco Coursey | https://github.com/pacocoursey/cmdk/blob/main/LICENSE.md | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| NumberFlow | 0.6.2 | MIT |  | https://github.com/barvian/number-flow (LICENSE.md du paquet) | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| Magic UI | — | MIT | Copyright (c) Magic UI | https://github.com/magicuidesign/magicui/blob/main/LICENSE.md | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. | composants gratuits uniquement (aucun composant Pro) ; sources copiées dans src/vendor/ui et dans les exports |
| Beautiful UI | — | MIT | Copyright (c) 2026 Shane Levine | https://beautifului.dev/license | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. | valeurs du préréglage de thème et règles d'animation (src/forge/tokens/beautiful-ui.ts) |
| Next.js | 16.4.6 | MIT |  | https://github.com/vercel/next.js/blob/canary/license.md | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| React | 19.3.0 | MIT |  | https://github.com/facebook/react/blob/main/LICENSE | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| Tailwind CSS | 4.3.3 | MIT |  | https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. | theme.css embarqué pour compiler dans le navigateur les classes saisies à la main |
| tw-animate-css | 1.4.0 | MIT |  | https://github.com/Wombosvideo/tw-animate-css (LICENSE du paquet) | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. | @keyframes enter/exit recopiés dans les exports qui utilisent le Dialogue |
| dnd-kit | 6.3.1 | MIT |  | https://github.com/clauderic/dnd-kit/blob/master/LICENSE | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| Monaco Editor | 0.57.0 | MIT |  | https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. | chargé localement (pas de CDN) |
| @monaco-editor/react | 4.7.0 | MIT |  | https://github.com/suren-atoyan/monaco-react/blob/master/LICENSE | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |
| Zustand | 5.1.0 | MIT |  | https://github.com/pmndrs/zustand/blob/main/LICENSE | Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence. |  |

## Retirés

| Technologie | Raison |
| --- | --- |
| Aceternity UI | Aucune licence n'est indiquée pour les composants gratuits ; les conditions du site (ui.aceternity.com/terms) interdisent de republier, reproduire et redistribuer son contenu, et la licence Pro interdit la redistribution des sources. Composants retirés et remplacés par des équivalents Magic UI (MIT). |
| Vaul | Licence MIT (Copyright (c) 2023 Emil Kowalski) compatible, mais dépôt déclaré non maintenu par son auteur (README, commit du 3 oct. 2025). Remplacé par le Drawer de Base UI. |

## Code tiers copié dans les composants exportés

Chaque export contient un fichier `THIRD_PARTY_NOTICES.md` qui ne liste que les bibliothèques réellement présentes, avec le texte complet de leur licence.

| Origine | Licence | Copyright | Source | Repris |
| --- | --- | --- | --- | --- |
| shadcn/ui | MIT | Copyright (c) 2023 shadcn | https://github.com/shadcn-ui/ui/blob/main/LICENSE.md | sources des primitives copiées dans ui/ (adaptées : couleurs du thème en variables CSS, imports relatifs) |
| Magic UI | MIT | Copyright (c) Magic UI | https://github.com/magicuidesign/magicui/blob/main/LICENSE.md | sources des composants animés copiés dans ui/ (composants gratuits uniquement, aucun composant Magic UI Pro) |
| tw-animate-css | MIT | Copyright (c) 2025 Wombosvideo | https://www.npmjs.com/package/tw-animate-css (fichier LICENSE du paquet) | @keyframes enter/exit et variables --tw-enter-*/--tw-exit-* recopiés dans styles.css |
| Beautiful UI | MIT | Copyright (c) 2026 Shane Levine | https://beautifului.dev/license | valeurs du préréglage de thème (palette clair/sombre, rayons, ombres, polices) et règles d'animation (durées, easings, entrées décalées) |

## Polices

Aucun fichier de police n'est copié dans les exports : elles sont chargées via `next/font` (studio) et documentées dans le README des exports qui les utilisent.

| Police | Licence | Copyright | Source |
| --- | --- | --- | --- |
| Inter | OFL-1.1 | Copyright (c) 2016 The Inter Project Authors | https://github.com/rsms/inter/blob/master/LICENSE.txt |
| JetBrains Mono | OFL-1.1 | Copyright 2020 The JetBrains Mono Project Authors | https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt |
| Geist / Geist Mono (interface du studio) | OFL-1.1 | Copyright 2026 The Geist Project Authors | https://github.com/vercel/geist-font/blob/main/OFL.txt |

## Exceptions acceptées

Paquets hors liste autorisée, acceptés nommément par le mainteneur (nom et licence exacts, `licenses.exceptions.json`). Un nouveau paquet, une licence modifiée ou un paquet « dev » apparaissant en production font échouer `npm run licenses:check`.

| Paquet | Versions installées | Licence | Portée | Via | Justification | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| @img/sharp-win32-x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | prod | next → sharp (dépendance optionnelle de Next.js pour next/image) | Binaire libvips installé par Next.js. Jamais exécuté : next.config.ts fixe images.unoptimized = true. Jamais inclus dans un composant exporté (vérifié par licenses:check et verify:export). Pas d'overrides, pour ne pas casser Next. | acceptée le 2026-11-13 par mainteneur |
| lightningcss | 1.32.0, 1.33.0 | MPL-2.0 | dev | tailwindcss / @tailwindcss/node (compilation CSS au build) | Outil de build, jamais distribué dans le studio ni dans les exports. | acceptée le 2026-11-13 par mainteneur |
| lightningcss-win32-x64-msvc | 1.32.0, 1.33.0 | MPL-2.0 | dev | lightningcss (binaire natif Windows x64) | Binaire de l'outil de build lightningcss, jamais distribué. | acceptée le 2026-11-13 par mainteneur |
| axe-core | 4.14.0 | MPL-2.0 | dev | eslint-config-next → eslint-plugin-jsx-a11y (lint) | Utilisé uniquement par le linter, jamais distribué. | acceptée le 2026-11-13 par mainteneur |

## Attributions (Creative Commons BY)

| Paquet | Version | Licence | Portée | Attribution |
| --- | --- | --- | --- | --- |
| caniuse-lite | 1.0.30001826 | CC-BY-4.0 | prod | caniuse-lite (Ben Briggs, projet browserslist), « version allégée de caniuse-db » — données de compatibilité de https://caniuse.com, licence Creative Commons Attribution 4.0 International (fichier LICENSE du paquet). Utilisé par Next.js via browserslist. |
| spdx-exceptions | 2.5.0 | CC-BY-3.0 | dev | « Copyright © 2010-2015 Linux Foundation and its Contributors. Licensed under the Creative Commons Attribution License 3.0 Unported » (README du paquet). |
| spdx-ranges | 2.1.1 | (MIT AND CC-BY-3.0) | dev | Standard SPDX : Linux Foundation et contributeurs, Creative Commons Attribution License 3.0 Unported ; code du paquet : Copyright (c) 2015 Kyle E. Mitchell, MIT (README et LICENSE.md du paquet). |

## Toutes les dépendances installées (766)

| Paquet | Version | Licence | Portée | Dépôt |
| --- | --- | --- | --- | --- |
| @alloc/quick-lru | 5.3.0 | MIT | dev | https://github.com/aleclarson/quick-lru |
| @babel/code-frame | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/compat-data | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/core | 7.29.13 | MIT | prod | https://github.com/babel/babel |
| @babel/generator | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-annotate-as-pure | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-compilation-targets | 7.29.13 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-create-class-features-plugin | 7.29.13 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-globals | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-member-expression-to-functions | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-module-imports | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-module-transforms | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-optimise-call-expression | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-plugin-utils | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-replace-supers | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-skip-transparent-expression-wrappers | 7.29.13 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-string-parser | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-string-parser | 8.1.2 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-validator-identifier | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-validator-identifier | 8.0.6 | MIT | prod | https://github.com/babel/babel |
| @babel/helper-validator-option | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/helpers | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/parser | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/parser | 8.1.2 | MIT | prod | https://github.com/babel/babel |
| @babel/plugin-syntax-jsx | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/plugin-syntax-typescript | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/plugin-transform-modules-commonjs | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/plugin-transform-typescript | 7.29.9 | MIT | prod | https://github.com/babel/babel |
| @babel/preset-typescript | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/runtime | 8.1.2 | MIT | prod | https://github.com/babel/babel |
| @babel/template | 7.29.7 | MIT | prod | https://github.com/babel/babel |
| @babel/traverse | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/types | 7.29.14 | MIT | prod | https://github.com/babel/babel |
| @babel/types | 8.1.2 | MIT | prod | https://github.com/babel/babel |
| @base-ui/react | 1.9.0 | MIT | prod | https://github.com/mui/base-ui |
| @base-ui/utils | 0.5.0 | MIT | prod | https://github.com/mui/base-ui |
| @dnd-kit/accessibility | 3.1.1 | MIT | prod | https://github.com/clauderic/dnd-kit |
| @dnd-kit/core | 6.3.1 | MIT | prod | https://github.com/clauderic/dnd-kit |
| @dnd-kit/sortable | 10.0.0 | MIT | prod | https://github.com/clauderic/dnd-kit |
| @dnd-kit/utilities | 3.2.2 | MIT | prod | https://github.com/clauderic/dnd-kit |
| @dotenvx/dotenvx | 1.75.1 | BSD-3-Clause | prod | https://github.com/dotenvx/dotenvx |
| @dotenvx/primitives | 0.8.0 | BSD-3-Clause | prod | https://github.com/dotenvx/dotenvx |
| @esbuild/win32-x64 | 0.28.2 | MIT | dev | https://github.com/evanw/esbuild |
| @eslint-community/eslint-utils | 4.10.1 | MIT | dev | https://github.com/eslint-community/eslint-utils |
| @eslint-community/eslint-utils | 4.9.1 | MIT | dev | https://github.com/eslint-community/eslint-utils |
| @eslint-community/regexpp | 4.12.3 | MIT | dev | https://github.com/eslint-community/regexpp |
| @eslint/config-array | 0.21.2 | Apache-2.0 | dev | https://github.com/eslint/rewrite |
| @eslint/config-helpers | 0.4.2 | Apache-2.0 | dev | https://github.com/eslint/rewrite |
| @eslint/core | 0.17.0 | Apache-2.0 | dev | https://github.com/eslint/rewrite |
| @eslint/eslintrc | 3.3.7 | MIT | dev | https://github.com/eslint/eslintrc |
| @eslint/js | 9.39.5 | MIT | dev | https://github.com/eslint/eslint |
| @eslint/object-schema | 2.1.7 | Apache-2.0 | dev | https://github.com/eslint/rewrite |
| @eslint/plugin-kit | 0.4.1 | Apache-2.0 | dev | https://github.com/eslint/rewrite |
| @floating-ui/core | 1.8.0 | MIT | prod | https://github.com/floating-ui/floating-ui |
| @floating-ui/dom | 1.8.0 | MIT | prod | https://github.com/floating-ui/floating-ui |
| @floating-ui/react-dom | 2.1.9 | MIT | prod | https://github.com/floating-ui/floating-ui |
| @floating-ui/utils | 0.2.12 | MIT | prod | https://github.com/floating-ui/floating-ui |
| @gar/promise-retry | 1.0.3 | MIT | dev | https://github.com/wraithgar/node-promise-retry |
| @humanfs/core | 0.19.2 | Apache-2.0 | dev | https://github.com/humanwhocodes/humanfs |
| @humanfs/node | 0.16.8 | Apache-2.0 | dev | https://github.com/humanwhocodes/humanfs |
| @humanfs/types | 0.15.0 | Apache-2.0 | dev | https://github.com/humanwhocodes/humanfs |
| @humanwhocodes/module-importer | 1.0.1 | Apache-2.0 | dev | https://github.com/humanwhocodes/module-importer |
| @humanwhocodes/retry | 0.4.3 | Apache-2.0 | dev | https://github.com/humanwhocodes/retry |
| @img/colour | 1.1.0 | MIT | prod | https://github.com/lovell/colour |
| @img/sharp-win32-x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later ⚠ | prod | https://github.com/lovell/sharp |
| @isaacs/fs-minipass | 4.0.1 | ISC | dev | https://github.com/npm/fs-minipass |
| @isaacs/string-locale-compare | 1.1.0 | ISC | dev | https://github.com/isaacs/string-locale-compare |
| @jridgewell/gen-mapping | 0.3.13 | MIT | prod | https://github.com/jridgewell/sourcemaps |
| @jridgewell/remapping | 2.3.5 | MIT | prod | https://github.com/jridgewell/sourcemaps |
| @jridgewell/resolve-uri | 3.1.2 | MIT | prod | https://github.com/jridgewell/resolve-uri |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | prod | https://github.com/jridgewell/sourcemaps |
| @jridgewell/trace-mapping | 0.3.31 | MIT | prod | https://github.com/jridgewell/sourcemaps |
| @modelcontextprotocol/core | 2.4.0 | Apache-2.0 | prod | https://github.com/modelcontextprotocol/typescript-sdk |
| @modelcontextprotocol/server | 2.4.0 | Apache-2.0 | prod | https://github.com/modelcontextprotocol/typescript-sdk |
| @monaco-editor/loader | 1.7.0 | MIT | prod | https://github.com/suren-atoyan/monaco-loader |
| @monaco-editor/react | 4.7.0 | MIT | prod | https://github.com/suren-atoyan/monaco-react |
| @next/env | 16.4.6 | MIT | prod | https://github.com/vercel/next.js |
| @next/eslint-plugin-next | 16.4.6 | MIT | dev | https://github.com/vercel/next.js |
| @next/swc-win32-x64-msvc | 16.4.6 | MIT | prod | https://github.com/vercel/next.js |
| @nodelib/fs.scandir | 2.1.5 | MIT | prod | https://github.com/nodelib/nodelib.git#master |
| @nodelib/fs.stat | 2.0.5 | MIT | prod | https://github.com/nodelib/nodelib.git#master |
| @nodelib/fs.walk | 1.2.8 | MIT | prod | https://github.com/nodelib/nodelib.git#master |
| @nolyfill/is-core-module | 1.0.39 | MIT | dev | https://github.com/SukkaW/nolyfill |
| @npmcli/agent | 4.0.2 | ISC | dev | https://github.com/npm/agent |
| @npmcli/arborist | 9.6.0 | ISC | dev | https://github.com/npm/cli |
| @npmcli/fs | 5.0.0 | ISC | dev | https://github.com/npm/fs |
| @npmcli/git | 7.0.2 | ISC | dev | https://github.com/npm/git |
| @npmcli/installed-package-contents | 4.0.0 | ISC | dev | https://github.com/npm/installed-package-contents |
| @npmcli/map-workspaces | 5.0.3 | ISC | dev | https://github.com/npm/map-workspaces |
| @npmcli/metavuln-calculator | 9.0.3 | ISC | dev | https://github.com/npm/metavuln-calculator |
| @npmcli/name-from-folder | 4.0.0 | ISC | dev | https://github.com/npm/name-from-folder |
| @npmcli/node-gyp | 5.0.0 | ISC | dev | https://github.com/npm/node-gyp |
| @npmcli/package-json | 7.0.5 | ISC | dev | https://github.com/npm/package-json |
| @npmcli/promise-spawn | 9.0.2 | ISC | dev | https://github.com/npm/promise-spawn |
| @npmcli/query | 5.0.0 | ISC | dev | https://github.com/npm/query |
| @npmcli/redact | 4.0.0 | ISC | dev | https://github.com/npm/redact |
| @npmcli/run-script | 10.0.4 | ISC | dev | https://github.com/npm/run-script |
| @number-flow/react | 0.6.2 | MIT | prod | https://github.com/barvian/number-flow |
| @oxc-project/types | 0.156.0 | MIT | dev | https://github.com/oxc-project/oxc |
| @radix-ui/number | 1.1.3 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/primitive | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-accessible-icon | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-accordion | 1.3.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-alert-dialog | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-arrow | 1.1.17 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-aspect-ratio | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-avatar | 1.3.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-checkbox | 1.4.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-collapsible | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-collection | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-compose-refs | 1.1.5 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-context-menu | 2.4.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-context | 1.3.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-dialog | 1.3.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-direction | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-dismissable-layer | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-dropdown-menu | 2.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-focus-guards | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-focus-scope | 1.3.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-form | 0.3.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-hover-card | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-id | 1.1.4 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-label | 2.1.17 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-menu | 2.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-menubar | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-navigation-menu | 1.4.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-one-time-password-field | 0.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-password-toggle-field | 0.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-popover | 1.3.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-popper | 1.4.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-portal | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-presence | 1.1.11 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-primitive | 2.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-progress | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-radio-group | 1.5.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-roving-focus | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-scroll-area | 1.4.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-select | 2.4.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-separator | 1.2.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-slider | 1.6.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-slot | 1.5.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-switch | 1.4.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-tabs | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-toast | 1.3.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-toggle-group | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-toggle | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-toolbar | 1.2.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-tooltip | 1.4.1 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-callback-ref | 1.1.5 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-controllable-state | 1.3.0 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-effect-event | 0.0.5 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-escape-keydown | 1.1.6 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-is-hydrated | 0.1.3 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-layout-effect | 1.1.4 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-previous | 1.1.4 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-rect | 1.1.4 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-use-size | 1.1.5 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/react-visually-hidden | 1.2.13 | MIT | prod | https://github.com/radix-ui/primitives |
| @radix-ui/rect | 1.1.3 | MIT | prod | https://github.com/radix-ui/primitives |
| @rolldown/binding-win32-x64-msvc | 1.2.19 | MIT | dev | https://github.com/rolldown/rolldown |
| @rolldown/pluginutils | 1.1.0 | MIT | dev | https://github.com/rolldown/plugins |
| @rtsao/scc | 1.1.0 | MIT | dev | https://github.com/rtsao/scc |
| @sec-ant/readable-stream | 0.4.1 | MIT | prod | https://github.com/Sec-ant/readable-stream |
| @shadcn/registry | 0.2.1 | MIT | prod | https://github.com/shadcn-ui/ui |
| @sigstore/bundle | 4.0.0 | Apache-2.0 | dev | https://github.com/sigstore/sigstore-js |
| @sigstore/core | 3.2.1 | Apache-2.0 | dev | https://github.com/sigstore/sigstore-js |
| @sigstore/protobuf-specs | 0.5.2 | Apache-2.0 | dev | https://github.com/sigstore/protobuf-specs |
| @sigstore/sign | 4.1.1 | Apache-2.0 | dev | https://github.com/sigstore/sigstore-js |
| @sigstore/tuf | 4.0.2 | Apache-2.0 | dev | https://github.com/sigstore/sigstore-js |
| @sigstore/verify | 3.1.1 | Apache-2.0 | dev | https://github.com/sigstore/sigstore-js |
| @sindresorhus/merge-streams | 4.0.0 | MIT | prod | https://github.com/sindresorhus/merge-streams |
| @swc/helpers | 0.5.23 | Apache-2.0 | prod | https://github.com/swc-project/swc |
| @tailwindcss/node | 4.3.3 | MIT | dev | https://github.com/tailwindlabs/tailwindcss |
| @tailwindcss/oxide-win32-x64-msvc | 4.3.3 | MIT | dev | https://github.com/tailwindlabs/tailwindcss |
| @tailwindcss/oxide | 4.3.3 | MIT | dev | https://github.com/tailwindlabs/tailwindcss |
| @tailwindcss/turbopack | 4.3.3 | MIT | dev | https://github.com/tailwindlabs/tailwindcss |
| @ts-morph/common | 0.27.0 | MIT | prod | https://github.com/dsherret/ts-morph |
| @tufjs/canonical-json | 2.0.0 | MIT | dev | https://github.com/theupdateframework/tuf-js |
| @tufjs/models | 4.1.0 | MIT | dev | https://github.com/theupdateframework/tuf-js |
| @types/chai | 5.2.3 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/deep-eql | 4.0.2 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/estree | 1.0.10 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/json-schema | 7.0.15 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/json5 | 0.0.29 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/node | 24.19.2 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react-dom | 19.3.0 | MIT | prod | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react | 19.3.0 | MIT | prod | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/trusted-types | 2.0.7 | MIT | prod | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/validate-npm-package-name | 4.0.2 | MIT | prod | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @typescript-eslint/eslint-plugin | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/parser | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/project-service | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/scope-manager | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/tsconfig-utils | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/type-utils | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/types | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/typescript-estree | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/utils | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/visitor-keys | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| @unrs/resolver-binding-win32-x64-msvc | 1.13.0 | MIT | dev | https://github.com/unrs/unrs-resolver |
| @vitest/mocker | 5.1.0 | MIT | dev | https://github.com/vitest-dev/vitest |
| @vitest/spy | 5.1.0 | MIT | dev | https://github.com/vitest-dev/vitest |
| abbrev | 2.0.0 | ISC | dev | https://github.com/npm/abbrev-js |
| abbrev | 4.0.0 | ISC | dev | https://github.com/npm/abbrev-js |
| acorn-jsx | 5.3.2 | MIT | dev | https://github.com/acornjs/acorn-jsx |
| acorn | 8.19.0 | MIT | dev | https://github.com/acornjs/acorn |
| agent-base | 7.1.4 | MIT | dev | https://github.com/TooTallNate/proxy-agents |
| ajv-formats | 2.1.1 | MIT | prod | https://github.com/ajv-validator/ajv-formats |
| ajv | 6.15.0 | MIT | dev | https://github.com/ajv-validator/ajv |
| ajv | 8.20.0 | MIT | prod | https://github.com/ajv-validator/ajv |
| ansi-colors | 4.1.3 | MIT | prod | https://github.com/doowb/ansi-colors |
| ansi-regex | 5.0.1 | MIT | prod | https://github.com/chalk/ansi-regex |
| ansi-regex | 6.6.0 | MIT | prod | https://github.com/chalk/ansi-regex |
| ansi-styles | 4.3.0 | MIT | dev | https://github.com/chalk/ansi-styles |
| any-promise | 1.3.0 | MIT | prod | https://github.com/kevinbeaty/any-promise |
| argparse | 2.0.1 | Python-2.0 | dev | https://github.com/nodeca/argparse |
| aria-hidden | 1.2.6 | MIT | prod | https://github.com/theKashey/aria-hidden |
| aria-query | 5.3.2 | Apache-2.0 | dev | https://github.com/A11yance/aria-query |
| array-buffer-byte-length | 1.0.2 | MIT | dev | https://github.com/inspect-js/array-buffer-byte-length |
| array-find-index | 1.0.2 | MIT | dev | https://github.com/sindresorhus/array-find-index |
| array-includes | 3.2.0 | MIT | dev | https://github.com/es-shims/array-includes |
| array.prototype.findlast | 1.2.5 | MIT | dev | https://github.com/es-shims/Array.prototype.findLast |
| array.prototype.findlastindex | 1.2.6 | MIT | dev | https://github.com/es-shims/Array.prototype.findLastIndex |
| array.prototype.flat | 1.3.3 | MIT | dev | https://github.com/es-shims/Array.prototype.flat |
| array.prototype.flatmap | 1.3.3 | MIT | dev | https://github.com/es-shims/Array.prototype.flatMap |
| array.prototype.tosorted | 1.1.4 | MIT | dev | https://github.com/es-shims/Array.prototype.toSorted |
| arraybuffer.prototype.slice | 1.0.4 | MIT | dev | https://github.com/es-shims/ArrayBuffer.prototype.slice |
| assertion-error | 2.0.1 | MIT | dev | https://github.com/chaijs/assertion-error |
| ast-types-flow | 0.0.8 | MIT | dev | https://github.com/kyldvs/ast-types-flow |
| ast-types | 0.16.3 | MIT | prod | https://github.com/benjamn/ast-types |
| async-function | 1.0.0 | MIT | dev | https://github.com/ljharb/async-function |
| atomically | 1.7.0 | MIT | prod | https://github.com/fabiospampinato/atomically |
| available-typed-arrays | 1.0.7 | MIT | dev | https://github.com/inspect-js/available-typed-arrays |
| axe-core | 4.14.0 | MPL-2.0 ⚠ | dev | https://github.com/dequelabs/axe-core |
| axobject-query | 4.1.0 | Apache-2.0 | dev | https://github.com/A11yance/axobject-query |
| balanced-match | 1.0.2 | MIT | dev | https://github.com/juliangruber/balanced-match |
| balanced-match | 4.0.4 | MIT | prod | https://github.com/juliangruber/balanced-match |
| baseline-browser-mapping | 2.11.37 | Apache-2.0 | prod | https://github.com/web-platform-dx/baseline-browser-mapping |
| bin-links | 6.0.3 | ISC | dev | https://github.com/npm/bin-links |
| brace-expansion | 1.1.22 | MIT | dev | https://github.com/juliangruber/brace-expansion |
| brace-expansion | 5.0.13 | MIT | prod | https://github.com/juliangruber/brace-expansion |
| braces | 3.0.3 | MIT | prod | https://github.com/micromatch/braces |
| browserslist | 4.29.5 | MIT | prod | https://github.com/browserslist/browserslist |
| bundle-name | 4.1.1 | MIT | prod | https://github.com/sindresorhus/bundle-name |
| cacache | 20.0.4 | ISC | dev | https://github.com/npm/cacache |
| call-bind-apply-helpers | 1.0.2 | MIT | dev | https://github.com/ljharb/call-bind-apply-helpers |
| call-bind | 1.0.9 | MIT | dev | https://github.com/ljharb/call-bind |
| call-bound | 1.0.4 | MIT | dev | https://github.com/ljharb/call-bound |
| callsites | 3.1.0 | MIT | dev | https://github.com/sindresorhus/callsites |
| caniuse-lite | 1.0.30001826 | CC-BY-4.0 | prod | https://github.com/browserslist/caniuse-lite |
| chai | 6.3.0 | MIT | dev | https://github.com/chaijs/chai |
| chalk | 4.1.2 | MIT | dev | https://github.com/chalk/chalk |
| chalk | 5.6.2 | MIT | prod | https://github.com/chalk/chalk |
| chownr | 3.0.0 | BlueOak-1.0.0 | dev | https://github.com/isaacs/chownr |
| class-variance-authority | 0.7.1 | Apache-2.0 | prod | https://github.com/joe-bell/cva |
| cli-cursor | 5.0.0 | MIT | prod | https://github.com/sindresorhus/cli-cursor |
| cli-spinners | 2.9.2 | MIT | prod | https://github.com/sindresorhus/cli-spinners |
| client-only | 0.0.1 | MIT | prod |  |
| clsx | 2.1.1 | MIT | prod | https://github.com/lukeed/clsx |
| cmd-shim | 8.0.0 | ISC | dev | https://github.com/npm/cmd-shim |
| cmdk | 1.1.1 | MIT | prod | https://github.com/pacocoursey/cmdk |
| cn | 0.2.6 | MIT | prod | https://github.com/shadcn-ui/cn |
| cn | 0.5.2 | MIT | prod | https://github.com/shadcn-ui/cn |
| code-block-writer | 13.0.3 | MIT | prod | https://github.com/dsherret/code-block-writer |
| color-convert | 2.0.1 | MIT | dev | https://github.com/Qix-/color-convert |
| color-name | 1.1.4 | MIT | dev | https://github.com/colorjs/color-name |
| commander | 11.1.0 | MIT | prod | https://github.com/tj/commander.js |
| commander | 14.0.3 | MIT | prod | https://github.com/tj/commander.js |
| commander | 4.1.1 | MIT | prod | https://github.com/tj/commander.js |
| common-ancestor-path | 2.0.0 | BlueOak-1.0.0 | dev | https://github.com/isaacs/common-ancestor-path |
| concat-map | 0.0.1 | MIT | dev | https://github.com/substack/node-concat-map |
| conf | 10.2.0 | MIT | prod | https://github.com/sindresorhus/conf |
| content-type | 2.1.0 | MIT | dev | https://github.com/jshttp/content-type |
| convert-source-map | 2.0.0 | MIT | prod | https://github.com/thlorenz/convert-source-map |
| core-util-is | 1.0.3 | MIT | prod | https://github.com/isaacs/core-util-is |
| cross-spawn | 7.0.6 | MIT | prod | https://github.com/moxystudio/node-cross-spawn |
| csstype | 3.2.3 | MIT | prod | https://github.com/frenic/csstype |
| damerau-levenshtein | 1.0.8 | BSD-2-Clause | dev | https://github.com/tad-lispy/node-damerau-levenshtein |
| data-view-buffer | 1.0.2 | MIT | dev | https://github.com/inspect-js/data-view-buffer |
| data-view-byte-length | 1.0.2 | MIT | dev | https://github.com/inspect-js/data-view-byte-length |
| data-view-byte-offset | 1.0.1 | MIT | dev | https://github.com/inspect-js/data-view-byte-offset |
| debounce-fn | 4.0.0 | MIT | prod | https://github.com/sindresorhus/debounce-fn |
| debug | 3.2.7 | MIT | dev | https://github.com/visionmedia/debug |
| debug | 4.4.3 | MIT | prod | https://github.com/debug-js/debug |
| dedent | 1.7.2 | MIT | prod | https://github.com/dmnd/dedent |
| deep-is | 0.1.4 | MIT | dev | https://github.com/thlorenz/deep-is |
| deepmerge | 4.3.1 | MIT | prod | https://github.com/TehShrike/deepmerge |
| default-browser-id | 5.0.1 | MIT | prod | https://github.com/sindresorhus/default-browser-id |
| default-browser | 5.5.1 | MIT | prod | https://github.com/sindresorhus/default-browser |
| define-data-property | 1.1.4 | MIT | dev | https://github.com/ljharb/define-data-property |
| define-lazy-prop | 2.0.0 | MIT | prod | https://github.com/sindresorhus/define-lazy-prop |
| define-lazy-prop | 3.0.0 | MIT | prod | https://github.com/sindresorhus/define-lazy-prop |
| define-properties | 1.2.1 | MIT | dev | https://github.com/ljharb/define-properties |
| detect-libc | 2.1.2 | Apache-2.0 | prod | https://github.com/lovell/detect-libc |
| detect-node-es | 1.1.0 | MIT | prod | https://github.com/thekashey/detect-node |
| diff | 8.0.4 | BSD-3-Clause | prod | https://github.com/kpdecker/jsdiff |
| doctrine | 2.1.0 | Apache-2.0 | dev | https://github.com/eslint/doctrine |
| dompurify | 3.4.15 | (MPL-2.0 OR Apache-2.0) | prod | https://github.com/cure53/DOMPurify |
| dot-prop | 6.0.1 | MIT | prod | https://github.com/sindresorhus/dot-prop |
| dotenv | 17.4.2 | BSD-2-Clause | prod | https://github.com/motdotla/dotenv |
| dunder-proto | 1.0.1 | MIT | dev | https://github.com/es-shims/dunder-proto |
| electron-to-chromium | 1.5.484 | ISC | prod | https://github.com/Kilian/electron-to-chromium |
| emoji-regex | 10.6.0 | MIT | prod | https://github.com/mathiasbynens/emoji-regex |
| emoji-regex | 9.2.2 | MIT | dev | https://github.com/mathiasbynens/emoji-regex |
| enhanced-resolve | 5.27.0 | MIT | dev | https://github.com/webpack/enhanced-resolve |
| enquirer | 2.4.1 | MIT | prod | https://github.com/enquirer/enquirer |
| env-paths | 2.2.1 | MIT | prod | https://github.com/sindresorhus/env-paths |
| es-abstract-get | 1.0.0 | MIT | dev | https://github.com/ljharb/es-abstract-get |
| es-abstract | 1.24.2 | MIT | dev | https://github.com/ljharb/es-abstract |
| es-define-property | 1.0.1 | MIT | dev | https://github.com/ljharb/es-define-property |
| es-errors | 1.3.0 | MIT | dev | https://github.com/ljharb/es-errors |
| es-iterator-helpers | 1.4.0 | MIT | dev | https://github.com/es-shims/iterator-helpers |
| es-module-lexer | 2.3.2 | MIT | dev | https://github.com/guybedford/es-module-lexer |
| es-object-atoms | 1.1.2 | MIT | dev | https://github.com/ljharb/es-object-atoms |
| es-set-tostringtag | 2.1.0 | MIT | dev | https://github.com/es-shims/es-set-tostringtag |
| es-shim-unscopables | 1.1.0 | MIT | dev | https://github.com/ljharb/es-shim-unscopables |
| es-to-primitive | 1.3.4 | MIT | dev | https://github.com/ljharb/es-to-primitive |
| esbuild | 0.28.2 | MIT | dev | https://github.com/evanw/esbuild |
| escalade | 3.2.0 | MIT | prod | https://github.com/lukeed/escalade |
| escape-string-regexp | 4.0.0 | MIT | dev | https://github.com/sindresorhus/escape-string-regexp |
| eslint-config-next | 16.4.6 | MIT | dev | https://github.com/vercel/next.js |
| eslint-import-resolver-node | 0.3.10 | MIT | dev | https://github.com/import-js/eslint-plugin-import |
| eslint-import-resolver-typescript | 3.10.1 | ISC | dev | https://github.com/import-js/eslint-import-resolver-typescript |
| eslint-module-utils | 2.14.0 | MIT | dev | https://github.com/import-js/eslint-plugin-import |
| eslint-plugin-import | 2.32.0 | MIT | dev | https://github.com/import-js/eslint-plugin-import |
| eslint-plugin-jsx-a11y | 6.10.2 | MIT | dev | https://github.com/jsx-eslint/eslint-plugin-jsx-a11y |
| eslint-plugin-react-hooks | 7.1.1 | MIT | dev | https://github.com/facebook/react |
| eslint-plugin-react | 7.37.5 | MIT | dev | https://github.com/jsx-eslint/eslint-plugin-react |
| eslint-scope | 8.4.0 | BSD-2-Clause | dev | https://github.com/eslint/js |
| eslint-visitor-keys | 3.4.3 | Apache-2.0 | dev | https://github.com/eslint/eslint-visitor-keys |
| eslint-visitor-keys | 4.2.1 | Apache-2.0 | dev | https://github.com/eslint/js |
| eslint-visitor-keys | 5.0.1 | Apache-2.0 | dev | https://github.com/eslint/js |
| eslint | 9.39.5 | MIT | dev | https://github.com/eslint/eslint |
| esm-env | 1.2.2 | MIT | prod | https://github.com/benmccann/esm-env |
| espree | 10.4.0 | BSD-2-Clause | dev | https://github.com/eslint/js |
| esprima | 4.0.1 | BSD-2-Clause | prod | https://github.com/jquery/esprima |
| esquery | 1.7.0 | BSD-3-Clause | dev | https://github.com/estools/esquery |
| esrecurse | 4.3.0 | BSD-2-Clause | dev | https://github.com/estools/esrecurse |
| estraverse | 5.3.0 | BSD-2-Clause | dev | https://github.com/estools/estraverse |
| estree-walker | 3.0.3 | MIT | dev | https://github.com/Rich-Harris/estree-walker |
| esutils | 2.0.3 | BSD-2-Clause | dev | https://github.com/estools/esutils |
| execa | 5.1.1 | MIT | prod | https://github.com/sindresorhus/execa |
| execa | 9.6.1 | MIT | prod | https://github.com/sindresorhus/execa |
| expect-type | 1.4.0 | Apache-2.0 | dev | https://github.com/mmkal/expect-type |
| exponential-backoff | 3.1.3 | Apache-2.0 | dev | https://github.com/coveooss/exponential-backoff |
| fast-deep-equal | 3.1.3 | MIT | prod | https://github.com/epoberezkin/fast-deep-equal |
| fast-glob | 3.3.1 | MIT | dev | https://github.com/mrmlnc/fast-glob |
| fast-glob | 3.3.3 | MIT | prod | https://github.com/mrmlnc/fast-glob |
| fast-json-stable-stringify | 2.1.0 | MIT | dev | https://github.com/epoberezkin/fast-json-stable-stringify |
| fast-levenshtein | 2.0.6 | MIT | dev | https://github.com/hiddentao/fast-levenshtein |
| fast-uri | 3.1.9 | BSD-3-Clause | prod | https://github.com/fastify/fast-uri |
| fastq | 1.20.3 | ISC | prod | https://github.com/mcollina/fastq |
| fdir | 6.5.0 | MIT | prod | https://github.com/thecodrr/fdir |
| figures | 6.1.0 | MIT | prod | https://github.com/sindresorhus/figures |
| file-entry-cache | 8.0.0 | MIT | dev | https://github.com/jaredwray/file-entry-cache |
| fill-range | 7.1.1 | MIT | prod | https://github.com/jonschlinkert/fill-range |
| find-up | 3.0.0 | MIT | prod | https://github.com/sindresorhus/find-up |
| find-up | 5.0.0 | MIT | dev | https://github.com/sindresorhus/find-up |
| flat-cache | 4.0.1 | MIT | dev | https://github.com/jaredwray/flat-cache |
| flatted | 3.4.4 | ISC | dev | https://github.com/WebReflection/flatted |
| for-each | 0.3.5 | MIT | dev | https://github.com/Raynos/for-each |
| framer-motion | 14.13.0 | MIT | prod | https://github.com/motiondivision/motion |
| fs-extra | 11.4.1 | MIT | prod | https://github.com/jprichardson/node-fs-extra |
| fs-minipass | 3.0.3 | ISC | dev | https://github.com/npm/fs-minipass |
| function-bind | 1.1.2 | MIT | dev | https://github.com/Raynos/function-bind |
| function.prototype.name | 1.2.0 | MIT | dev | https://github.com/es-shims/Function.prototype.name |
| functions-have-names | 1.2.3 | MIT | dev | https://github.com/inspect-js/functions-have-names |
| fuzzysort | 3.1.0 | MIT | prod | https://github.com/farzher/fuzzysort |
| generator-function | 2.0.1 | MIT | dev | https://github.com/TimothyGu/generator-function |
| gensync | 1.0.0-beta.2 | MIT | prod | https://github.com/loganfsmyth/gensync |
| get-east-asian-width | 1.7.0 | MIT | prod | https://github.com/sindresorhus/get-east-asian-width |
| get-intrinsic | 1.3.0 | MIT | dev | https://github.com/ljharb/get-intrinsic |
| get-nonce | 1.0.1 | MIT | prod | https://github.com/theKashey/get-nonce |
| get-own-enumerable-keys | 1.0.0 | MIT | prod | https://github.com/sindresorhus/get-own-enumerable-keys |
| get-proto | 1.0.1 | MIT | dev | https://github.com/ljharb/get-proto |
| get-stream | 6.0.1 | MIT | prod | https://github.com/sindresorhus/get-stream |
| get-stream | 9.0.1 | MIT | prod | https://github.com/sindresorhus/get-stream |
| get-symbol-description | 1.1.0 | MIT | dev | https://github.com/inspect-js/get-symbol-description |
| get-tsconfig | 4.14.3 | MIT | dev | https://github.com/privatenumber/get-tsconfig |
| glob-parent | 5.1.2 | ISC | prod | https://github.com/gulpjs/glob-parent |
| glob-parent | 6.0.2 | ISC | dev | https://github.com/gulpjs/glob-parent |
| glob | 13.0.7 | BlueOak-1.0.0 | dev | https://github.com/isaacs/node-glob |
| globals | 14.0.0 | MIT | dev | https://github.com/sindresorhus/globals |
| globals | 16.4.0 | MIT | dev | https://github.com/sindresorhus/globals |
| globalthis | 1.0.4 | MIT | dev | https://github.com/ljharb/System.global |
| gopd | 1.2.0 | MIT | dev | https://github.com/ljharb/gopd |
| graceful-fs | 4.2.12 | BlueOak-1.0.0 | prod | https://github.com/isaacs/node-graceful-fs |
| has-bigints | 1.1.0 | MIT | dev | https://github.com/ljharb/has-bigints |
| has-flag | 4.0.0 | MIT | dev | https://github.com/sindresorhus/has-flag |
| has-property-descriptors | 1.0.2 | MIT | dev | https://github.com/inspect-js/has-property-descriptors |
| has-proto | 1.2.0 | MIT | dev | https://github.com/inspect-js/has-proto |
| has-symbols | 1.1.0 | MIT | dev | https://github.com/inspect-js/has-symbols |
| has-tostringtag | 1.0.2 | MIT | dev | https://github.com/inspect-js/has-tostringtag |
| hasown | 2.0.4 | MIT | dev | https://github.com/inspect-js/hasOwn |
| hermes-estree | 0.25.1 | MIT | dev | https://github.com/facebook/hermes |
| hermes-parser | 0.25.1 | MIT | dev | https://github.com/facebook/hermes |
| hosted-git-info | 9.0.3 | ISC | dev | https://github.com/npm/hosted-git-info |
| http-cache-semantics | 4.3.0 | BSD-2-Clause | dev | https://github.com/kornelski/http-cache-semantics |
| http-proxy-agent | 7.0.2 | MIT | dev | https://github.com/TooTallNate/proxy-agents |
| https-proxy-agent | 7.0.6 | MIT | dev | https://github.com/TooTallNate/proxy-agents |
| human-signals | 2.1.0 | Apache-2.0 | prod | https://github.com/ehmicky/human-signals |
| human-signals | 8.0.1 | Apache-2.0 | prod | https://github.com/ehmicky/human-signals |
| iconv-lite | 0.7.3 | MIT | dev | https://github.com/pillarjs/iconv-lite |
| idb | 8.0.4 | ISC | prod | https://github.com/jakearchibald/idb |
| ignore-walk | 8.0.0 | ISC | dev | https://github.com/npm/ignore-walk |
| ignore | 5.3.2 | MIT | prod | https://github.com/kaelzhang/node-ignore |
| ignore | 7.0.14 | MIT | dev | https://github.com/kaelzhang/node-ignore |
| immediate | 3.0.6 | MIT | prod | https://github.com/calvinmetcalf/immediate |
| immer | 11.2.10 | MIT | prod | https://github.com/immerjs/immer |
| import-fresh | 3.3.1 | MIT | dev | https://github.com/sindresorhus/import-fresh |
| imurmurhash | 0.1.4 | MIT | dev | https://github.com/jensyt/imurmurhash-js |
| inherits | 2.0.4 | ISC | prod | https://github.com/isaacs/inherits |
| ini | 6.0.0 | ISC | dev | https://github.com/npm/ini |
| internal-slot | 1.1.0 | MIT | dev | https://github.com/ljharb/internal-slot |
| ip-address | 10.7.6 | MIT | prod | https://github.com/beaugunderson/ip-address |
| is-array-buffer | 3.0.5 | MIT | dev | https://github.com/inspect-js/is-array-buffer |
| is-async-function | 2.1.1 | MIT | dev | https://github.com/inspect-js/is-async-function |
| is-bigint | 1.1.0 | MIT | dev | https://github.com/inspect-js/is-bigint |
| is-boolean-object | 1.2.2 | MIT | dev | https://github.com/inspect-js/is-boolean-object |
| is-bun-module | 2.0.0 | MIT | dev | https://github.com/SunsetTechuila/is-bun-module |
| is-callable | 1.2.7 | MIT | dev | https://github.com/inspect-js/is-callable |
| is-core-module | 2.18.0 | MIT | dev | https://github.com/inspect-js/is-core-module |
| is-data-view | 1.0.2 | MIT | dev | https://github.com/inspect-js/is-data-view |
| is-date-object | 1.1.0 | MIT | dev | https://github.com/inspect-js/is-date-object |
| is-docker | 2.2.1 | MIT | prod | https://github.com/sindresorhus/is-docker |
| is-docker | 3.0.0 | MIT | prod | https://github.com/sindresorhus/is-docker |
| is-document.all | 1.0.0 | MIT | dev | https://github.com/inspect-js/is-document.all |
| is-extglob | 2.1.1 | MIT | prod | https://github.com/jonschlinkert/is-extglob |
| is-finalizationregistry | 1.1.1 | MIT | dev | https://github.com/inspect-js/is-finalizationregistry |
| is-generator-function | 1.1.2 | MIT | dev | https://github.com/inspect-js/is-generator-function |
| is-glob | 4.0.3 | MIT | prod | https://github.com/micromatch/is-glob |
| is-in-ssh | 1.0.0 | MIT | prod | https://github.com/sindresorhus/is-in-ssh |
| is-inside-container | 1.0.0 | MIT | prod | https://github.com/sindresorhus/is-inside-container |
| is-interactive | 2.0.0 | MIT | prod | https://github.com/sindresorhus/is-interactive |
| is-map | 2.0.3 | MIT | dev | https://github.com/inspect-js/is-map |
| is-negative-zero | 2.0.3 | MIT | dev | https://github.com/inspect-js/is-negative-zero |
| is-number-object | 1.1.1 | MIT | dev | https://github.com/inspect-js/is-number-object |
| is-number | 7.0.0 | MIT | prod | https://github.com/jonschlinkert/is-number |
| is-obj | 2.0.0 | MIT | prod | https://github.com/sindresorhus/is-obj |
| is-obj | 3.0.0 | MIT | prod | https://github.com/sindresorhus/is-obj |
| is-plain-obj | 4.1.0 | MIT | prod | https://github.com/sindresorhus/is-plain-obj |
| is-regex | 1.2.1 | MIT | dev | https://github.com/inspect-js/is-regex |
| is-regexp | 3.1.0 | MIT | prod | https://github.com/sindresorhus/is-regexp |
| is-set | 2.0.3 | MIT | dev | https://github.com/inspect-js/is-set |
| is-shared-array-buffer | 1.0.4 | MIT | dev | https://github.com/inspect-js/is-shared-array-buffer |
| is-stream | 2.0.1 | MIT | prod | https://github.com/sindresorhus/is-stream |
| is-stream | 4.0.1 | MIT | prod | https://github.com/sindresorhus/is-stream |
| is-string | 1.1.1 | MIT | dev | https://github.com/inspect-js/is-string |
| is-symbol | 1.1.1 | MIT | dev | https://github.com/inspect-js/is-symbol |
| is-typed-array | 1.1.15 | MIT | dev | https://github.com/inspect-js/is-typed-array |
| is-unicode-supported | 1.3.0 | MIT | prod | https://github.com/sindresorhus/is-unicode-supported |
| is-unicode-supported | 2.1.0 | MIT | prod | https://github.com/sindresorhus/is-unicode-supported |
| is-weakmap | 2.0.2 | MIT | dev | https://github.com/inspect-js/is-weakmap |
| is-weakref | 1.1.1 | MIT | dev | https://github.com/inspect-js/is-weakref |
| is-weakset | 2.0.4 | MIT | dev | https://github.com/inspect-js/is-weakset |
| is-wsl | 2.2.0 | MIT | prod | https://github.com/sindresorhus/is-wsl |
| is-wsl | 3.1.1 | MIT | prod | https://github.com/sindresorhus/is-wsl |
| isarray | 1.0.0 | MIT | prod | https://github.com/juliangruber/isarray |
| isarray | 2.0.5 | MIT | dev | https://github.com/juliangruber/isarray |
| isexe | 2.0.0 | ISC | prod | https://github.com/isaacs/isexe |
| isexe | 3.1.5 | BlueOak-1.0.0 | prod | https://github.com/isaacs/isexe |
| isexe | 4.0.0 | BlueOak-1.0.0 | dev | https://github.com/isaacs/isexe |
| iterator.prototype | 1.1.5 | MIT | dev | https://github.com/ljharb/Iterator.prototype |
| jiti | 2.7.0 | MIT | dev | https://github.com/unjs/jiti |
| js-tokens | 4.0.0 | MIT | prod | https://github.com/lydell/js-tokens |
| js-yaml | 4.3.2 | MIT | dev | https://github.com/nodeca/js-yaml |
| jsesc | 3.1.0 | MIT | prod | https://github.com/mathiasbynens/jsesc |
| json-buffer | 3.0.1 | MIT | dev | https://github.com/dominictarr/json-buffer |
| json-parse-even-better-errors | 5.0.0 | MIT | dev | https://github.com/npm/json-parse-even-better-errors |
| json-schema-traverse | 0.4.1 | MIT | dev | https://github.com/epoberezkin/json-schema-traverse |
| json-schema-traverse | 1.0.0 | MIT | prod | https://github.com/epoberezkin/json-schema-traverse |
| json-schema-typed | 7.0.3 | BSD-2-Clause | prod | https://github.com/typeslick/json-schema-typed |
| json-stable-stringify-without-jsonify | 1.0.1 | MIT | dev | https://github.com/samn/json-stable-stringify |
| json-stringify-nice | 1.1.4 | ISC | dev | https://github.com/isaacs/json-stringify-nice |
| json5 | 1.0.2 | MIT | dev | https://github.com/json5/json5 |
| json5 | 2.2.3 | MIT | prod | https://github.com/json5/json5 |
| jsonfile | 6.2.1 | MIT | prod | https://github.com/jprichardson/node-jsonfile |
| jsonparse | 1.3.1 | MIT | dev | https://github.com/creationix/jsonparse |
| jsx-ast-utils | 3.3.5 | MIT | dev | https://github.com/jsx-eslint/jsx-ast-utils |
| jszip | 3.10.2 | (MIT OR GPL-3.0-or-later) | prod | https://github.com/Stuk/jszip |
| just-diff-apply | 5.5.0 | MIT | dev | https://github.com/angus-c/just |
| just-diff | 6.0.2 | MIT | dev | https://github.com/angus-c/just |
| keyv | 4.5.4 | MIT | dev | https://github.com/jaredwray/keyv |
| kleur | 3.0.3 | MIT | prod | https://github.com/lukeed/kleur |
| kleur | 4.1.5 | MIT | prod | https://github.com/lukeed/kleur |
| language-subtag-registry | 0.3.23 | CC0-1.0 | dev | https://github.com/mattcg/language-subtag-registry |
| language-tags | 1.0.9 | MIT | dev | https://github.com/mattcg/language-tags |
| levn | 0.4.1 | MIT | dev | https://github.com/gkz/levn |
| license-checker-rseidelsohn | 5.0.1 | BSD-3-Clause | dev | https://github.com/RSeidelsohn/license-checker-rseidelsohn |
| lie | 3.3.0 | MIT | prod | https://github.com/calvinmetcalf/lie |
| lightningcss-win32-x64-msvc | 1.32.0 | MPL-2.0 ⚠ | dev | https://github.com/parcel-bundler/lightningcss |
| lightningcss-win32-x64-msvc | 1.33.0 | MPL-2.0 ⚠ | dev | https://github.com/parcel-bundler/lightningcss |
| lightningcss | 1.32.0 | MPL-2.0 ⚠ | dev | https://github.com/parcel-bundler/lightningcss |
| lightningcss | 1.33.0 | MPL-2.0 ⚠ | dev | https://github.com/parcel-bundler/lightningcss |
| lines-and-columns | 1.2.4 | MIT | prod | https://github.com/eventualbuddha/lines-and-columns |
| locate-path | 3.0.0 | MIT | prod | https://github.com/sindresorhus/locate-path |
| locate-path | 6.0.0 | MIT | dev | https://github.com/sindresorhus/locate-path |
| lodash.clonedeep | 4.5.0 | MIT | dev | https://github.com/lodash/lodash |
| lodash.merge | 4.6.2 | MIT | dev | https://github.com/lodash/lodash |
| log-symbols | 6.0.0 | MIT | prod | https://github.com/sindresorhus/log-symbols |
| loose-envify | 1.4.0 | MIT | dev | https://github.com/zertosh/loose-envify |
| lru-cache | 11.5.3 | BlueOak-1.0.0 | dev | https://github.com/isaacs/node-lru-cache |
| lru-cache | 5.1.1 | ISC | prod | https://github.com/isaacs/node-lru-cache |
| lucide-react | 1.72.0 | ISC | prod | https://github.com/lucide-icons/lucide |
| magic-string | 0.30.21 | MIT | dev | https://github.com/Rich-Harris/magic-string |
| magic-string | 1.4.5 | MIT | dev | https://github.com/Rich-Harris/magic-string |
| make-fetch-happen | 15.0.6 | ISC | dev | https://github.com/npm/make-fetch-happen |
| marked | 14.0.0 | MIT | prod | https://github.com/markedjs/marked |
| math-intrinsics | 1.1.0 | MIT | dev | https://github.com/es-shims/math-intrinsics |
| merge-stream | 2.0.0 | MIT | prod | https://github.com/grncdr/merge-stream |
| merge2 | 1.4.1 | MIT | prod | https://github.com/teambition/merge2 |
| micromatch | 4.0.8 | MIT | prod | https://github.com/micromatch/micromatch |
| mimic-fn | 2.1.0 | MIT | prod | https://github.com/sindresorhus/mimic-fn |
| mimic-fn | 3.1.0 | MIT | prod | https://github.com/sindresorhus/mimic-fn |
| mimic-function | 5.0.1 | MIT | prod | https://github.com/sindresorhus/mimic-function |
| minimatch | 10.2.6 | BlueOak-1.0.0 | prod | https://github.com/isaacs/minimatch |
| minimatch | 3.1.5 | ISC | dev | https://github.com/isaacs/minimatch |
| minimist | 1.2.8 | MIT | prod | https://github.com/minimistjs/minimist |
| minipass-collect | 2.0.1 | ISC | dev | https://github.com/isaacs/minipass-collect |
| minipass-fetch | 5.0.2 | MIT | dev | https://github.com/npm/minipass-fetch |
| minipass-flush | 1.0.7 | BlueOak-1.0.0 | dev | https://github.com/isaacs/minipass-flush |
| minipass-pipeline | 1.2.4 | ISC | dev |  |
| minipass-sized | 2.0.0 | ISC | dev | https://github.com/isaacs/minipass-sized |
| minipass | 3.3.6 | ISC | dev | https://github.com/isaacs/minipass |
| minipass | 7.1.3 | BlueOak-1.0.0 | dev | https://github.com/isaacs/minipass |
| minizlib | 3.1.0 | MIT | dev | https://github.com/isaacs/minizlib |
| mkdirp | 1.0.4 | MIT | dev | https://github.com/isaacs/node-mkdirp |
| monaco-editor | 0.57.0 | MIT | prod | https://github.com/microsoft/monaco-editor |
| motion-dom | 14.13.0 | MIT | prod | https://github.com/motiondivision/motion |
| motion-utils | 14.7.0 | MIT | prod | https://github.com/motiondivision/motion |
| motion | 14.13.0 | MIT | prod | https://github.com/motiondivision/motion |
| ms | 2.1.3 | MIT | prod | https://github.com/vercel/ms |
| mz | 2.7.0 | MIT | prod | https://github.com/normalize/mz |
| nanoid | 3.3.20 | MIT | prod | https://github.com/ai/nanoid |
| nanoid | 6.0.2 | MIT | prod | https://github.com/ai/nanoid |
| napi-postinstall | 0.3.8 | MIT | dev | https://github.com/un-ts/napi-postinstall |
| natural-compare | 1.4.0 | MIT | dev | https://github.com/litejs/natural-compare-lite |
| negotiator | 1.1.0 | MIT | dev | https://github.com/jshttp/negotiator |
| next-themes | 0.4.6 | MIT | prod | https://github.com/pacocoursey/next-themes |
| next | 16.4.6 | MIT | prod | https://github.com/vercel/next.js |
| node-exports-info | 1.6.2 | MIT | dev | https://github.com/inspect-js/node-exports-info |
| node-gyp | 12.4.0 | MIT | dev | https://github.com/nodejs/node-gyp |
| node-releases | 2.0.63 | MIT | prod | https://github.com/chicoxyzzy/node-releases |
| nopt | 7.2.1 | ISC | dev | https://github.com/npm/nopt |
| nopt | 9.0.0 | ISC | dev | https://github.com/npm/nopt |
| npm-bundled | 5.0.0 | ISC | dev | https://github.com/npm/npm-bundled |
| npm-install-checks | 8.0.0 | BSD-2-Clause | dev | https://github.com/npm/npm-install-checks |
| npm-normalize-package-bin | 5.0.0 | ISC | dev | https://github.com/npm/npm-normalize-package-bin |
| npm-package-arg | 13.0.2 | ISC | dev | https://github.com/npm/npm-package-arg |
| npm-packlist | 10.0.4 | ISC | dev | https://github.com/npm/npm-packlist |
| npm-pick-manifest | 11.0.3 | ISC | dev | https://github.com/npm/npm-pick-manifest |
| npm-registry-fetch | 19.1.1 | ISC | dev | https://github.com/npm/npm-registry-fetch |
| npm-run-path | 4.0.1 | MIT | prod | https://github.com/sindresorhus/npm-run-path |
| npm-run-path | 6.0.0 | MIT | prod | https://github.com/sindresorhus/npm-run-path |
| number-flow | 0.6.2 | MIT | prod | https://github.com/barvian/number-flow |
| object-assign | 4.1.1 | MIT | prod | https://github.com/sindresorhus/object-assign |
| object-inspect | 1.13.4 | MIT | dev | https://github.com/inspect-js/object-inspect |
| object-keys | 1.1.1 | MIT | dev | https://github.com/ljharb/object-keys |
| object-treeify | 1.1.33 | MIT | prod | https://github.com/blackflux/object-treeify |
| object.assign | 4.1.7 | MIT | dev | https://github.com/ljharb/object.assign |
| object.entries | 1.1.9 | MIT | dev | https://github.com/es-shims/Object.entries |
| object.fromentries | 2.0.8 | MIT | dev | https://github.com/es-shims/Object.fromEntries |
| object.groupby | 1.0.3 | MIT | dev | https://github.com/es-shims/Object.groupBy |
| object.values | 1.2.1 | MIT | dev | https://github.com/es-shims/Object.values |
| obug | 3.0.0 | MIT | dev | https://github.com/sxzz/obug |
| onetime | 5.1.2 | MIT | prod | https://github.com/sindresorhus/onetime |
| onetime | 7.0.0 | MIT | prod | https://github.com/sindresorhus/onetime |
| open | 11.0.4 | MIT | prod | https://github.com/sindresorhus/open |
| open | 8.4.2 | MIT | prod | https://github.com/sindresorhus/open |
| optionator | 0.9.4 | MIT | dev | https://github.com/gkz/optionator |
| ora | 8.2.0 | MIT | prod | https://github.com/sindresorhus/ora |
| own-keys | 1.0.2 | MIT | dev | https://github.com/ljharb/own-keys |
| p-limit | 2.3.0 | MIT | prod | https://github.com/sindresorhus/p-limit |
| p-limit | 3.1.0 | MIT | dev | https://github.com/sindresorhus/p-limit |
| p-locate | 3.0.0 | MIT | prod | https://github.com/sindresorhus/p-locate |
| p-locate | 5.0.0 | MIT | dev | https://github.com/sindresorhus/p-locate |
| p-map | 7.1.1 | MIT | dev | https://github.com/sindresorhus/p-map |
| p-try | 2.2.0 | MIT | prod | https://github.com/sindresorhus/p-try |
| pacote | 21.5.3 | ISC | dev | https://github.com/npm/pacote |
| pako | 1.0.11 | (MIT AND Zlib) | prod | https://github.com/nodeca/pako |
| parent-module | 1.0.1 | MIT | dev | https://github.com/sindresorhus/parent-module |
| parse-conflict-json | 5.0.1 | ISC | dev | https://github.com/npm/parse-conflict-json |
| parse-ms | 4.0.0 | MIT | prod | https://github.com/sindresorhus/parse-ms |
| path-browserify | 1.0.1 | MIT | prod | https://github.com/browserify/path-browserify |
| path-exists | 3.0.0 | MIT | prod | https://github.com/sindresorhus/path-exists |
| path-exists | 4.0.0 | MIT | dev | https://github.com/sindresorhus/path-exists |
| path-key | 3.1.1 | MIT | prod | https://github.com/sindresorhus/path-key |
| path-key | 4.0.0 | MIT | prod | https://github.com/sindresorhus/path-key |
| path-parse | 1.0.7 | MIT | dev | https://github.com/jbgutierrez/path-parse |
| path-scurry | 2.0.2 | BlueOak-1.0.0 | dev | https://github.com/isaacs/path-scurry |
| picocolors | 1.1.1 | ISC | prod | https://github.com/alexeyraspopov/picocolors |
| picomatch | 2.3.2 | MIT | prod | https://github.com/micromatch/picomatch |
| picomatch | 4.0.7 | MIT | prod | https://github.com/micromatch/picomatch |
| pirates | 4.0.7 | MIT | prod | https://github.com/danez/pirates |
| pkg-up | 3.1.0 | MIT | prod | https://github.com/sindresorhus/pkg-up |
| playwright-core | 1.65.0 | Apache-2.0 | dev | https://github.com/microsoft/playwright |
| playwright | 1.65.0 | Apache-2.0 | dev | https://github.com/microsoft/playwright |
| possible-typed-array-names | 1.1.0 | MIT | dev | https://github.com/ljharb/possible-typed-array-names |
| postcss-selector-parser | 7.2.1 | MIT | prod | https://github.com/postcss/postcss-selector-parser |
| postcss | 8.5.23 | MIT | prod | https://github.com/postcss/postcss |
| postcss | 8.5.32 | MIT | dev | https://github.com/postcss/postcss |
| powershell-utils | 0.2.1 | MIT | prod | https://github.com/sindresorhus/powershell-utils |
| prelude-ls | 1.2.1 | MIT | dev | https://github.com/gkz/prelude-ls |
| pretty-ms | 9.3.1 | MIT | prod | https://github.com/sindresorhus/pretty-ms |
| proc-log | 6.1.0 | ISC | dev | https://github.com/npm/proc-log |
| process-nextick-args | 2.0.1 | MIT | prod | https://github.com/calvinmetcalf/process-nextick-args |
| proggy | 4.0.0 | ISC | dev | https://github.com/npm/proggy |
| promise-all-reject-late | 1.0.1 | ISC | dev |  |
| promise-call-limit | 3.0.2 | ISC | dev | https://github.com/isaacs/promise-call-limit |
| prompts | 2.4.2 | MIT | prod | https://github.com/terkelg/prompts |
| prop-types | 15.8.1 | MIT | dev | https://github.com/facebook/prop-types |
| punycode | 2.3.1 | MIT | dev | https://github.com/mathiasbynens/punycode.js |
| queue-microtask | 1.2.3 | MIT | prod | https://github.com/feross/queue-microtask |
| radix-ui | 1.8.1 | MIT | prod | https://github.com/radix-ui/primitives |
| react-dom | 19.3.0 | MIT | prod | https://github.com/react/react |
| react-is | 16.13.1 | MIT | dev | https://github.com/facebook/react |
| react-remove-scroll-bar | 2.3.8 | MIT | prod | https://github.com/theKashey/react-remove-scroll-bar |
| react-remove-scroll | 2.7.2 | MIT | prod | https://github.com/theKashey/react-remove-scroll |
| react-style-singleton | 2.2.3 | MIT | prod | https://github.com/theKashey/react-style-singleton |
| react | 19.3.0 | MIT | prod | https://github.com/react/react |
| read-cmd-shim | 6.0.0 | ISC | dev | https://github.com/npm/read-cmd-shim |
| readable-stream | 2.3.8 | MIT | prod | https://github.com/nodejs/readable-stream |
| recast | 0.23.21 | MIT | prod | https://github.com/benjamn/recast |
| reflect.getprototypeof | 1.0.10 | MIT | dev | https://github.com/es-shims/Reflect.getPrototypeOf |
| regexp.prototype.flags | 1.5.4 | MIT | dev | https://github.com/es-shims/RegExp.prototype.flags |
| require-from-string | 2.0.2 | MIT | prod | https://github.com/floatdrop/require-from-string |
| reselect | 5.3.0 | MIT | prod | https://github.com/reduxjs/reselect |
| resolve-from | 4.0.0 | MIT | dev | https://github.com/sindresorhus/resolve-from |
| resolve-pkg-maps | 1.0.0 | MIT | dev | https://github.com/privatenumber/resolve-pkg-maps |
| resolve | 2.0.0-next.7 | MIT | dev | https://github.com/browserify/resolve |
| restore-cursor | 5.1.0 | MIT | prod | https://github.com/sindresorhus/restore-cursor |
| reusify | 1.1.0 | MIT | prod | https://github.com/mcollina/reusify |
| rolldown | 1.2.19 | MIT | dev | https://github.com/rolldown/rolldown |
| run-applescript | 7.1.0 | MIT | prod | https://github.com/sindresorhus/run-applescript |
| run-parallel | 1.2.0 | MIT | prod | https://github.com/feross/run-parallel |
| safe-array-concat | 1.1.4 | MIT | dev | https://github.com/ljharb/safe-array-concat |
| safe-buffer | 5.1.2 | MIT | prod | https://github.com/feross/safe-buffer |
| safe-push-apply | 1.0.0 | MIT | dev | https://github.com/ljharb/safe-push-apply |
| safe-regex-test | 1.1.0 | MIT | dev | https://github.com/ljharb/safe-regex-test |
| safer-buffer | 2.1.2 | MIT | dev | https://github.com/ChALkeR/safer-buffer |
| scheduler | 0.28.0 | MIT | prod | https://github.com/react/react |
| semver | 6.3.2 | ISC | prod | https://github.com/npm/node-semver |
| semver | 7.8.6 | ISC | prod | https://github.com/npm/node-semver |
| set-function-length | 1.2.2 | MIT | dev | https://github.com/ljharb/set-function-length |
| set-function-name | 2.0.2 | MIT | dev | https://github.com/ljharb/set-function-name |
| set-proto | 1.0.0 | MIT | dev | https://github.com/ljharb/set-proto |
| setimmediate | 1.0.5 | MIT | prod | https://github.com/YuzuJS/setImmediate |
| shadcn | 4.23.0 | MIT | prod | https://github.com/shadcn-ui/ui |
| sharp | 0.35.5 | Apache-2.0 | prod | https://github.com/lovell/sharp |
| shebang-command | 2.0.0 | MIT | prod | https://github.com/kevva/shebang-command |
| shebang-regex | 3.0.0 | MIT | prod | https://github.com/sindresorhus/shebang-regex |
| side-channel-list | 1.0.1 | MIT | dev | https://github.com/ljharb/side-channel-list |
| side-channel-map | 1.0.1 | MIT | dev | https://github.com/ljharb/side-channel-map |
| side-channel-weakmap | 1.0.2 | MIT | dev | https://github.com/ljharb/side-channel-weakmap |
| side-channel | 1.1.1 | MIT | dev | https://github.com/ljharb/side-channel |
| signal-exit | 3.0.7 | ISC | prod | https://github.com/tapjs/signal-exit |
| signal-exit | 4.1.0 | ISC | prod | https://github.com/tapjs/signal-exit |
| sigstore | 4.1.1 | Apache-2.0 | dev | https://github.com/sigstore/sigstore-js |
| sisteransi | 1.0.5 | MIT | prod | https://github.com/terkelg/sisteransi |
| smart-buffer | 4.2.0 | MIT | prod | https://github.com/JoshGlazebrook/smart-buffer |
| socks-proxy-agent | 8.0.5 | MIT | dev | https://github.com/TooTallNate/proxy-agents |
| socks | 2.8.10 | MIT | prod | https://github.com/JoshGlazebrook/socks |
| sonner | 2.0.8 | MIT | prod | https://github.com/emilkowalski/sonner |
| source-map-js | 1.2.2 | BSD-3-Clause | prod | https://github.com/7rulnik/source-map-js |
| source-map | 0.6.1 | BSD-3-Clause | prod | https://github.com/mozilla/source-map |
| spdx-compare | 1.0.0 | MIT | dev | https://github.com/kemitchell/spdx-compare.js |
| spdx-correct | 3.2.0 | Apache-2.0 | dev | https://github.com/jslicense/spdx-correct.js |
| spdx-exceptions | 2.5.0 | CC-BY-3.0 | dev | https://github.com/kemitchell/spdx-exceptions.json |
| spdx-expression-parse | 3.0.1 | MIT | dev | https://github.com/jslicense/spdx-expression-parse.js |
| spdx-expression-parse | 4.0.0 | MIT | dev | https://github.com/jslicense/spdx-expression-parse.js |
| spdx-license-ids | 3.0.24 | CC0-1.0 | dev | https://github.com/jslicense/spdx-license-ids |
| spdx-ranges | 2.1.1 | (MIT AND CC-BY-3.0) | dev | https://github.com/kemitchell/spdx-ranges.js |
| spdx-satisfies | 6.0.1 | MIT | dev | https://github.com/kemitchell/spdx-satisfies.js |
| ssri | 13.0.1 | ISC | dev | https://github.com/npm/ssri |
| stable-hash | 0.0.5 | MIT | dev | https://github.com/shuding/stable-hash |
| state-local | 1.0.7 | MIT | prod | https://github.com/suren-atoyan/state-local |
| std-env | 4.3.0 | MIT | dev | https://github.com/unjs/std-env |
| stdin-discarder | 0.2.2 | MIT | prod | https://github.com/sindresorhus/stdin-discarder |
| stop-iteration-iterator | 1.1.0 | MIT | dev | https://github.com/ljharb/stop-iteration-iterator |
| string_decoder | 1.1.1 | MIT | prod | https://github.com/nodejs/string_decoder |
| string-width | 7.2.0 | MIT | prod | https://github.com/sindresorhus/string-width |
| string.prototype.includes | 2.0.1 | MIT | dev | https://github.com/mathiasbynens/String.prototype.includes |
| string.prototype.matchall | 4.1.0 | MIT | dev | https://github.com/es-shims/String.prototype.matchAll |
| string.prototype.repeat | 1.0.0 | MIT | dev | https://github.com/mathiasbynens/String.prototype.repeat |
| string.prototype.trim | 1.2.11 | MIT | dev | https://github.com/es-shims/String.prototype.trim |
| string.prototype.trimend | 1.0.10 | MIT | dev | https://github.com/es-shims/String.prototype.trimEnd |
| string.prototype.trimstart | 1.0.8 | MIT | dev | https://github.com/es-shims/String.prototype.trimStart |
| stringify-object | 5.0.0 | BSD-2-Clause | prod | https://github.com/yeoman/stringify-object |
| strip-ansi | 6.0.1 | MIT | prod | https://github.com/chalk/strip-ansi |
| strip-ansi | 7.2.0 | MIT | prod | https://github.com/chalk/strip-ansi |
| strip-bom | 3.0.0 | MIT | prod | https://github.com/sindresorhus/strip-bom |
| strip-final-newline | 2.0.0 | MIT | prod | https://github.com/sindresorhus/strip-final-newline |
| strip-final-newline | 4.0.0 | MIT | prod | https://github.com/sindresorhus/strip-final-newline |
| strip-json-comments | 3.1.1 | MIT | dev | https://github.com/sindresorhus/strip-json-comments |
| styled-jsx | 5.1.6 | MIT | prod | https://github.com/vercel/styled-jsx |
| sucrase | 3.35.1 | MIT | prod | https://github.com/alangpierce/sucrase |
| supports-color | 7.2.0 | MIT | dev | https://github.com/chalk/supports-color |
| supports-preserve-symlinks-flag | 1.0.0 | MIT | dev | https://github.com/inspect-js/node-supports-preserve-symlinks-flag |
| systeminformation | 5.33.20 | MIT | prod | https://github.com/sebhildebrandt/systeminformation |
| tailwindcss | 4.3.3 | MIT | dev | https://github.com/tailwindlabs/tailwindcss |
| tapable | 2.3.3 | MIT | dev | https://github.com/webpack/tapable |
| tar | 7.5.23 | BlueOak-1.0.0 | dev | https://github.com/isaacs/node-tar |
| thenify-all | 1.6.0 | MIT | prod | https://github.com/thenables/thenify-all |
| thenify | 3.3.1 | MIT | prod | https://github.com/thenables/thenify |
| tiny-invariant | 1.3.3 | MIT | prod | https://github.com/alexreardon/tiny-invariant |
| tinybench | 6.2.3 | MIT | dev | https://github.com/tinylibs/tinybench |
| tinyexec | 1.3.1 | MIT | dev | https://github.com/tinylibs/tinyexec |
| tinyglobby | 0.2.17 | MIT | prod | https://github.com/SuperchupuDev/tinyglobby |
| to-regex-range | 5.0.1 | MIT | prod | https://github.com/micromatch/to-regex-range |
| treeify | 1.1.0 | MIT | dev | https://github.com/notatestuser/treeify |
| treeverse | 3.0.0 | ISC | dev | https://github.com/npm/treeverse |
| ts-api-utils | 2.5.0 | MIT | dev | https://github.com/JoshuaKGoldberg/ts-api-utils |
| ts-interface-checker | 0.1.13 | Apache-2.0 | prod | https://github.com/gristlabs/ts-interface-checker |
| ts-morph | 26.0.0 | MIT | prod | https://github.com/dsherret/ts-morph |
| tsconfig-paths | 3.15.0 | MIT | dev | https://github.com/dividab/tsconfig-paths |
| tsconfig-paths | 4.2.0 | MIT | prod | https://github.com/dividab/tsconfig-paths |
| tslib | 2.9.1 | 0BSD | prod | https://github.com/Microsoft/tslib |
| tsx | 4.23.15 | MIT | dev | https://github.com/privatenumber/tsx |
| tuf-js | 4.1.0 | MIT | dev | https://github.com/theupdateframework/tuf-js |
| tw-animate-css | 1.4.0 | MIT | prod | https://github.com/Wombosvideo/tw-animate-css |
| type-check | 0.4.0 | MIT | dev | https://github.com/gkz/type-check |
| type-fest | 4.41.0 | (MIT OR CC0-1.0) | prod | https://github.com/sindresorhus/type-fest |
| typed-array-buffer | 1.0.3 | MIT | dev | https://github.com/inspect-js/typed-array-buffer |
| typed-array-byte-length | 1.0.3 | MIT | dev | https://github.com/inspect-js/typed-array-byte-length |
| typed-array-byte-offset | 1.0.5 | MIT | dev | https://github.com/inspect-js/typed-array-byte-offset |
| typed-array-length | 1.0.8 | MIT | dev | https://github.com/inspect-js/typed-array-length |
| typescript-eslint | 8.72.2 | MIT | dev | https://github.com/typescript-eslint/typescript-eslint |
| typescript | 5.9.3 | Apache-2.0 | dev | https://github.com/microsoft/TypeScript |
| unbox-primitive | 1.1.0 | MIT | dev | https://github.com/ljharb/unbox-primitive |
| undici-types | 7.24.6 | MIT | dev | https://github.com/nodejs/undici |
| undici | 6.29.1 | MIT | dev | https://github.com/nodejs/undici |
| undici | 7.30.2 | MIT | prod | https://github.com/nodejs/undici |
| unicorn-magic | 0.3.0 | MIT | prod | https://github.com/sindresorhus/unicorn-magic |
| universalify | 2.0.1 | MIT | prod | https://github.com/RyanZim/universalify |
| unrs-resolver | 1.13.0 | MIT | dev | https://github.com/unrs/unrs-resolver |
| update-browserslist-db | 1.3.4 | MIT | prod | https://github.com/browserslist/update-db |
| uri-js | 4.4.1 | BSD-2-Clause | dev | https://github.com/garycourt/uri-js |
| use-callback-ref | 1.3.3 | MIT | prod | https://github.com/theKashey/use-callback-ref |
| use-sidecar | 1.1.3 | MIT | prod | https://github.com/theKashey/use-sidecar |
| use-sync-external-store | 1.7.0 | MIT | prod | https://github.com/react/react |
| util-deprecate | 1.0.2 | MIT | prod | https://github.com/TooTallNate/util-deprecate |
| validate-npm-package-name | 7.0.2 | ISC | prod | https://github.com/npm/validate-npm-package-name |
| vite | 8.3.8 | MIT | dev | https://github.com/vitejs/vite |
| vitest | 5.1.0 | MIT | dev | https://github.com/vitest-dev/vitest |
| walk-up-path | 4.0.0 | ISC | dev | https://github.com/isaacs/walk-up-path |
| which-boxed-primitive | 1.1.1 | MIT | dev | https://github.com/inspect-js/which-boxed-primitive |
| which-builtin-type | 1.2.1 | MIT | dev | https://github.com/inspect-js/which-builtin-type |
| which-collection | 1.0.2 | MIT | dev | https://github.com/inspect-js/which-collection |
| which-typed-array | 1.1.24 | MIT | dev | https://github.com/inspect-js/which-typed-array |
| which | 2.0.2 | ISC | prod | https://github.com/isaacs/node-which |
| which | 4.0.0 | ISC | prod | https://github.com/npm/node-which |
| which | 6.0.1 | ISC | dev | https://github.com/npm/node-which |
| why-is-node-running | 3.2.1 | MIT | dev | https://github.com/mafintosh/why-is-node-running |
| word-wrap | 1.2.5 | MIT | dev | https://github.com/jonschlinkert/word-wrap |
| write-file-atomic | 7.0.1 | ISC | dev | https://github.com/npm/write-file-atomic |
| wsl-utils | 1.0.1 | MIT | prod | https://github.com/sindresorhus/wsl-utils |
| yallist | 3.1.1 | ISC | prod | https://github.com/isaacs/yallist |
| yallist | 4.0.0 | ISC | dev | https://github.com/isaacs/yallist |
| yallist | 5.0.0 | BlueOak-1.0.0 | dev | https://github.com/isaacs/yallist |
| yocto-queue | 0.1.0 | MIT | dev | https://github.com/sindresorhus/yocto-queue |
| yocto-spinner | 1.2.2 | MIT | prod | https://github.com/sindresorhus/yocto-spinner |
| yoctocolors | 2.2.0 | MIT | prod | https://github.com/sindresorhus/yoctocolors |
| zod-validation-error | 4.0.2 | MIT | dev | https://github.com/causaly/zod-validation-error |
| zod | 4.6.7 | MIT | prod | https://github.com/colinhacks/zod |
| zustand | 5.1.0 | MIT | prod | https://github.com/pmndrs/zustand |
