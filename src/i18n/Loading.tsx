"use client";
import { useT } from "./react";

/** Écran de chargement plein écran, dans la langue choisie */
export function Loading() {
  const t = useT();
  return <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">{t("Loading…")}</div>;
}
