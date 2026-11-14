"use client";
import * as React from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_TAGS, setCurrentLocale, translate, type Locale, type TParams } from "./core";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (text: string, params?: TParams) => string };

const LocaleContext = React.createContext<Ctx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (text, params) => translate(DEFAULT_LOCALE, text, params),
});

/** Langue initiale lue côté serveur dans le cookie (aucun clignotement au chargement) */
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setState] = React.useState<Locale>(initialLocale);
  // Code hors React (générateur, export) : même langue que l'interface, dès le premier rendu client
  if (typeof window !== "undefined") setCurrentLocale(locale);

  const setLocale = React.useCallback((l: Locale) => {
    setCurrentLocale(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = LOCALE_TAGS[l];
    setState(l);
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const value = React.useMemo<Ctx>(() => ({ locale, setLocale, t: (text, params) => translate(locale, text, params) }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return React.useContext(LocaleContext);
}

/** Fonction de traduction de la langue courante : t("Export"), t("Delete {name}?", { name }) */
export function useT() {
  return React.useContext(LocaleContext).t;
}
