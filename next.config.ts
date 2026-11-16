import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Pas d'optimisation d'images : sharp/libvips (LGPL-3.0, dépendance optionnelle de Next) n'est jamais exécuté.
  images: { unoptimized: true },
  partialPrefetching: true,
  turbopack: {
    // Racine explicite : un package-lock.json dans un dossier parent (ex. le dossier utilisateur) ne doit
    // pas devenir la racine du workspace (sinon le dossier .next est surveillé et le dev server boucle).
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
