"use client";
import { findBrick } from "@/forge/bricks/registry";
import type { Node, StyleState } from "@/forge/model/types";
import { useStudio } from "@/forge/store/studio";
import { Segmented } from "./controls";
import { useT } from "@/i18n/react";

const LABELS: Record<string, string> = { base: "Default", hover: "Hover", focus: "Focus", active: "Active", disabled: "Disabled" };

/** Choix de l'état prévisualisé (forcé sur le canvas) et édité dans le panneau Style */
export function StatePicker({ node }: { node: Node }) {
  const t = useT();
  const forceState = useStudio((s) => s.forceState);
  const brick = findBrick(node.brick);
  const states = (brick?.states ?? []).filter((s): s is StyleState => s !== "loading");
  if (!states.length) return null;
  return (
    <div className="border-b px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{t("Previewed and edited state")}</span>
        {brick?.states.includes("loading") && <span>{t("Loading: prop below")}</span>}
      </div>
      <Segmented
        ariaLabel={t("State")}
        value={forceState ?? "base"}
        onChange={(v) => useStudio.setState({ forceState: v === "base" ? null : (v as StyleState) })}
        options={["base", ...states].map((s) => ({ value: s, label: t(LABELS[s]) }))}
      />
    </div>
  );
}
