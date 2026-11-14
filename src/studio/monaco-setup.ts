"use client";
/**
 * Monaco chargé depuis node_modules (paquet monaco-editor, MIT) au lieu du CDN jsDelivr par défaut
 * de @monaco-editor/react : le studio fonctionne hors ligne. Les workers sont empaquetés par le bundler.
 */
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

type Env = { getWorker: (workerId: string, label: string) => Worker };

if (typeof window !== "undefined") {
  (self as unknown as { MonacoEnvironment: Env }).MonacoEnvironment = {
    getWorker(_id, label) {
      if (label === "typescript" || label === "javascript")
        return new Worker(new URL("monaco-editor/language/typescript/ts.worker.js", import.meta.url), { type: "module" });
      if (label === "css" || label === "scss" || label === "less")
        return new Worker(new URL("monaco-editor/language/css/css.worker.js", import.meta.url), { type: "module" });
      if (label === "json") return new Worker(new URL("monaco-editor/language/json/json.worker.js", import.meta.url), { type: "module" });
      return new Worker(new URL("monaco-editor/editor/editor.worker.js", import.meta.url), { type: "module" });
    },
  };
  loader.config({ monaco });
  // exposé pour les tests de bout en bout (même convention que le chargeur CDN)
  (window as unknown as { monaco: typeof monaco }).monaco = monaco;
}

export { monaco };
