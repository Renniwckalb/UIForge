/**
 * Textes de licence des sources tierces copiées ou adaptées dans les composants exportés.
 * Chaque entrée a été vérifiée à sa source officielle (voir `source`) — cf. LICENSES.md.
 */

const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export const mitText = (copyright: string) => `MIT License\n\n${copyright}\n\n${MIT_BODY}`;

export type ThirdParty = {
  id: string;
  name: string;
  license: string;
  copyright: string;
  source: string;
  /** Ce qui est repris dans le composant exporté */
  usedFor: string;
  text: string;
};

export const THIRD_PARTY: Record<string, ThirdParty> = {
  shadcn: {
    id: "shadcn",
    name: "shadcn/ui",
    license: "MIT",
    copyright: "Copyright (c) 2023 shadcn",
    source: "https://github.com/shadcn-ui/ui/blob/main/LICENSE.md",
    usedFor: "sources of the primitives copied into ui/ (adapted: theme colors as CSS variables, relative imports)",
    text: mitText("Copyright (c) 2023 shadcn"),
  },
  magicui: {
    id: "magicui",
    name: "Magic UI",
    license: "MIT",
    copyright: "Copyright (c) Magic UI",
    source: "https://github.com/magicuidesign/magicui/blob/main/LICENSE.md",
    usedFor: "sources of the animated components copied into ui/ (free components only, no Magic UI Pro component)",
    text: mitText("Copyright (c) Magic UI"),
  },
  "tw-animate-css": {
    id: "tw-animate-css",
    name: "tw-animate-css",
    license: "MIT",
    copyright: "Copyright (c) 2025 Wombosvideo",
    source: "https://www.npmjs.com/package/tw-animate-css (package LICENSE file)",
    usedFor: "enter/exit @keyframes and --tw-enter-*/--tw-exit-* variables copied into styles.css",
    text: mitText("Copyright (c) 2025 Wombosvideo"),
  },
  "beautiful-ui": {
    id: "beautiful-ui",
    name: "Beautiful UI",
    license: "MIT",
    copyright: "Copyright (c) 2026 Shane Levine",
    source: "https://beautifului.dev/license",
    usedFor: "theme preset values (light/dark palette, radii, shadows, fonts) and animation rules (durations, easings, staggered entrances)",
    text: mitText("Copyright (c) 2026 Shane Levine"),
  },
};

/** Licences des paquets npm qu'un export peut demander d'installer (non inclus dans le dossier) */
export const NPM_LICENSES: Record<string, string> = {
  "@base-ui/react": "MIT",
  "@number-flow/react": "MIT",
  "class-variance-authority": "Apache-2.0",
  cmdk: "MIT",
  cn: "MIT",
  "lucide-react": "ISC",
  motion: "MIT",
  "radix-ui": "MIT",
};

export const FONT_LICENSES = [
  { name: "Inter", license: "OFL-1.1", copyright: "Copyright (c) 2016 The Inter Project Authors", source: "https://github.com/rsms/inter/blob/master/LICENSE.txt" },
  { name: "JetBrains Mono", license: "OFL-1.1", copyright: "Copyright 2020 The JetBrains Mono Project Authors", source: "https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt" },
];
