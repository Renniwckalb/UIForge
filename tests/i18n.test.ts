import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DICTIONARIES, setCurrentLocale, translate, translateNodeName } from "../src/i18n/core";
import { ALL_BRICKS, FAMILIES, rawBrick } from "../src/forge/bricks/registry";
import { TEMPLATES } from "../src/forge/model/templates";
import { COLOR_LABELS, FONT_CHOICES } from "../src/forge/tokens/theme";
import { BEAUTIFUL_UI_MOTION } from "../src/forge/tokens/beautiful-ui";
import { THIRD_PARTY } from "../src/forge/licenses/third-party";
import { buildExport } from "../src/forge/export/bundle";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

/** Textes passés à t("…") / tr("…") dans le code (littéraux uniquement) */
function sourceKeys(): Set<string> {
  const keys = new Set<string>();
  const re = /\b(?:t|tt|tr)\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  for (const f of files("src")) {
    if (f.includes(join("src", "i18n"))) continue;
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(re)) keys.add(m[1].startsWith('"') ? JSON.parse(m[1]) : m[1].slice(1, -1).replace(/\\'/g, "'"));
  }
  return keys;
}

/** Textes stockés dans les données (briques, modèles, thème…) et traduits à l'affichage */
function dataKeys(): Set<string> {
  const keys = new Set<string>();
  const add = (s?: string) => s && keys.add(s);
  for (const b of [...ALL_BRICKS, rawBrick]) {
    add(b.label);
    add(b.description);
    add(b.library.name);
    for (const f of Object.values(b.props)) {
      add(f.label);
      add(f.help);
      if (f.type === "enum") f.options.forEach((o) => /[a-z]{2}/.test(o.label) && o.label !== o.value && add(o.label));
    }
    for (const t of b.texts) {
      add(t.label);
      [t.default].flat().forEach((v) => v && /[a-z]{3}/i.test(v) && add(v));
    }
    Object.values(b.slots ?? {}).forEach((s) => add(s.label));
  }
  FAMILIES.forEach((f) => (add(f.label), add(f.hint)));
  TEMPLATES.forEach((t) => (add(t.label), add(t.description)));
  Object.values(COLOR_LABELS).forEach(add);
  FONT_CHOICES.forEach((f) => add(f.label));
  BEAUTIFUL_UI_MOTION.forEach((m) => (add(m.label), add(m.description)));
  Object.values(THIRD_PARTY).forEach((t) => add(t.usedFor));
  return keys;
}

/** Noms propres (bibliothèques, logos d'exemple) : identiques dans toutes les langues */
const PROPER_NOUNS = new Set(["shadcn/ui", "Radix UI", "Base UI", "cmdk", "NumberFlow", "Magic UI", "Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark"]);

describe("traductions", () => {
  const all = new Set([...sourceKeys(), ...dataKeys()].filter((k) => !PROPER_NOUNS.has(k)));

  for (const [lang, dict] of Object.entries(DICTIONARIES)) {
    it(`chaque texte de l'interface est traduit en ${lang}`, () => {
      const missing = [...all].filter((k) => !(k in dict));
      expect(missing).toEqual([]);
    });
    it(`les paramètres {…} sont conservés en ${lang}`, () => {
      const broken = Object.entries(dict).filter(([en, tr]) => {
        const p = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
        return p(en) !== p(tr);
      });
      expect(broken).toEqual([]);
    });
  }

  it("l'anglais est la langue source : pas de traduction, paramètres remplacés", () => {
    expect(translate("en", "Delete {name}?", { name: "Card" })).toBe("Delete Card?");
    expect(translate("fr", "Delete {name}?", { name: "Card" })).toBe("Supprimer Card ?");
    expect(translate("zh", "Delete {name}?", { name: "Card" })).toBe("删除 Card？");
    expect(translate("fr", "texte inconnu")).toBe("texte inconnu");
  });

  it("noms d'éléments automatiques traduits à l'affichage", () => {
    expect(translateNodeName("fr", "Button 2")).toBe("Bouton 2");
    expect(translateNodeName("zh", "Root")).toBe("根");
    expect(translateNodeName("fr", "Card 1 (copy)")).toBe("Carte 1 (copie)");
    expect(translateNodeName("fr", "MonBloc")).toBe("MonBloc");
  });

  it("modèles et export dans la langue choisie", () => {
    try {
      setCurrentLocale("fr");
      const doc = TEMPLATES.find((t) => t.id === "pricing-card")!.build();
      expect(Object.values(doc.nodes).some((n) => n.texts.label?.value === "Commencer")).toBe(true);
      const readme = buildExport(doc).files["README.md"];
      expect(readme).toContain("## Licences");
      setCurrentLocale("zh");
      expect(buildExport(TEMPLATES[1].build()).files["README.md"]).toContain("## 许可证");
    } finally {
      setCurrentLocale("en");
    }
    expect(buildExport(TEMPLATES[1].build()).files["README.md"]).toContain("## Licenses");
  });
});
