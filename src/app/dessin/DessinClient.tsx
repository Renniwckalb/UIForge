"use client";
import dynamic from "next/dynamic";
import { Loading } from "@/i18n/Loading";

// Rendu uniquement côté navigateur : le dessin est restauré depuis localStorage dès le premier rendu
const SvgEditor = dynamic(() => import("@/draw/SvgEditor").then((m) => m.SvgEditor), {
  ssr: false,
  loading: () => <Loading />,
});

export function DessinClient() {
  return <SvgEditor />;
}
