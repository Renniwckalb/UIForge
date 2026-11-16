"use client";
/**
 * Sélecteur d'icône de la brique lucide.icon : recherche par mots (anglais, quelques synonymes) dans les
 * 2 000+ icônes Lucide, aperçu en grille. Les icônes ne sont chargées qu'à l'ouverture.
 */
import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LUCIDE_ICON_NAMES, searchIcons } from "@/forge/icons/lucide";
import { getLucideIcon, loadLucideIcons, lucideIconsLoaded, subscribeLucideIcons } from "@/forge/runtime/icons";
import { useT } from "@/i18n/react";

const SHOWN = 96;

function useIcons() {
  const loaded = React.useSyncExternalStore(subscribeLucideIcons, lucideIconsLoaded, () => false);
  React.useEffect(() => {
    if (!loaded) void loadLucideIcons();
  }, [loaded]);
  return loaded;
}

function Glyph({ name, className }: { name: string; className?: string }) {
  // composant de la bibliothèque déjà chargée (référence stable), pas créé pendant le rendu
  const icon = getLucideIcon(name);
  return icon ? React.createElement(icon, { className, "aria-hidden": true }) : <span className={className} />;
}

export function IconPicker({ id, value, onChange }: { id: string; value: string; onChange: (name: string) => void }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const results = React.useMemo(() => searchIcons(query, SHOWN), [query]);
  const total = query.trim() ? searchIcons(query, 10_000).length : LUCIDE_ICON_NAMES.length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" className="flex h-7 w-full items-center gap-2 rounded-md border border-input px-2 text-left text-[12px] hover:bg-muted">
          {open || lucideIconsLoaded() ? <Glyph name={value} className="size-4 shrink-0" /> : <span className="size-4" />}
          <span className="truncate font-mono">{value}</span>
          <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      {open && (
        <PopoverContent align="end" collisionPadding={8} className="w-80 p-2">
          <IconGrid value={value} query={query} setQuery={setQuery} results={results} total={total} onPick={(n) => (onChange(n), setOpen(false))} t={t} />
        </PopoverContent>
      )}
    </Popover>
  );
}

function IconGrid({
  value,
  query,
  setQuery,
  results,
  total,
  onPick,
  t,
}: {
  value: string;
  query: string;
  setQuery: (q: string) => void;
  results: string[];
  total: number;
  onPick: (name: string) => void;
  t: ReturnType<typeof useT>;
}) {
  const loaded = useIcons();
  return (
    <div className="flex flex-col gap-2">
      <label className="flex h-8 items-center gap-2 rounded-md border border-input px-2">
        <Search className="size-3.5 opacity-60" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && results[0] && onPick(results[0])}
          placeholder={t("Search icons (arrow, user, delete…)")}
          aria-label={t("Search icons")}
          className="w-full bg-transparent text-[12px] outline-none"
        />
      </label>
      {!loaded ? (
        <p className="py-6 text-center text-[12px] text-muted-foreground">{t("Loading icons…")}</p>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-muted-foreground">{t("No icon found.")}</p>
      ) : (
        <div role="listbox" aria-label={t("Icons")} className="grid max-h-64 grid-cols-8 gap-0.5 overflow-y-auto">
          {results.map((n) => (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={n === value}
              title={n}
              aria-label={n}
              onClick={() => onPick(n)}
              className={`flex aspect-square items-center justify-center rounded-md hover:bg-muted ${n === value ? "bg-muted ring-1 ring-foreground/30" : ""}`}
            >
              <Glyph name={n} className="size-4" />
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        {total > results.length ? t("{shown} of {total} icons — refine the search", { shown: results.length, total }) : t("{total} icons", { total })}
      </p>
    </div>
  );
}
