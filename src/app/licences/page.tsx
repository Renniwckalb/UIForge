"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ALL_BRICKS, FAMILIES } from "@/forge/bricks/registry";
import { LICENSES_MD, PROJECT_LICENSE } from "@/forge/generated/licenses";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

/** Licence de la bibliothèque d'origine de chaque brique (vérifiée, cf. LICENSES.md) */
const LIBRARY_LICENSE: Record<string, { license: string; copyright: string }> = {
  "shadcn/ui": { license: "MIT", copyright: "© 2023 shadcn" },
  "Radix UI": { license: "MIT", copyright: "© 2022 WorkOS" },
  "Base UI": { license: "MIT", copyright: "© 2019 Material-UI SAS" },
  cmdk: { license: "MIT", copyright: "© 2022 Paco Coursey" },
  NumberFlow: { license: "MIT", copyright: "© 2024 Maxwell Barvian" },
  "Magic UI": { license: "MIT", copyright: "© Magic UI" },
  "Primitives (HTML + Tailwind)": { license: "MIT", copyright: "© Tailwind Labs, Inc." },
};

/** Rendu Markdown minimal (titres, paragraphes, listes, tableaux, code inline, liens) */
function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|https?:\/\/[^\s|)]+)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`")) return <code key={i} className="rounded bg-muted px-1 font-mono text-[0.9em]">{p.slice(1, -1)}</code>;
    if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} className="underline">{link[1]}</a>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all underline">{p}</a>;
    return p.split("<br>").flatMap((t, j) => (j ? [<br key={`${i}-${j}`} />, t] : [t]));
  });
}

function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    const h = l.match(/^(#{1,3}) (.*)$/);
    if (h) {
      const Tag = (["h1", "h2", "h3"] as const)[h[1].length - 1];
      blocks.push(<Tag key={i} id={h[2].toLowerCase().replace(/[^a-z0-9]+/g, "-")} className={h[1].length === 1 ? "text-xl font-semibold" : "mt-6 text-base font-semibold"}>{h[2]}</Tag>);
      continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|")));
        i++;
      }
      i--;
      const [head, , ...body] = rows;
      blocks.push(
        <div key={i} className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-muted/60">
              <tr>{head.map((c, j) => <th key={j} className="px-2 py-1.5 font-medium whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k} className="border-t align-top">
                  {r.map((c, j) => <td key={j} className="px-2 py-1.5">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    blocks.push(<p key={i} className="text-[13px] leading-relaxed text-muted-foreground">{inline(l)}</p>);
  }
  return <div className="flex flex-col gap-3">{blocks}</div>;
}

export default function LicencesPage() {
  const t = useT();
  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/" aria-label={t("Back")}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="text-[15px] font-semibold tracking-tight">UI Forge</span>
          <span className="text-[13px] text-muted-foreground">{t("Licenses · project licensed under {license}", { license: PROJECT_LICENSE })}</span>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">{t("Bricks and source libraries")}</h2>
          {FAMILIES.map((f) => (
            <div key={f.id} className="overflow-x-auto rounded-md border bg-background">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="w-56 px-2 py-1.5 font-medium">{t(f.label)}</th>
                    <th className="w-48 px-2 py-1.5 font-medium">{t("Library")}</th>
                    <th className="w-20 px-2 py-1.5 font-medium">{t("License")}</th>
                    <th className="px-2 py-1.5 font-medium">{t("Copyright")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_BRICKS.filter((b) => b.family === f.id).map((b) => {
                    const l = LIBRARY_LICENSE[b.library.name];
                    return (
                      <tr key={b.id} className="border-t">
                        <td className="px-2 py-1.5">{t(b.label)}</td>
                        <td className="px-2 py-1.5">
                          {b.library.url ? <a href={b.library.url} target="_blank" rel="noreferrer" className="underline">{t(b.library.name)}</a> : t(b.library.name)}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{l?.license ?? "?"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{l?.copyright ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </section>
        <section className="rounded-md border bg-background p-4">
          <Markdown source={LICENSES_MD} />
        </section>
      </main>
    </div>
  );
}
