"use client";
import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronRight, Copy, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { findBrick } from "@/forge/bricks/registry";
import type { NodeId } from "@/forge/model/types";
import { useStudio } from "@/forge/store/studio";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BrickIcon } from "./brick-icon";
import { translateNodeName } from "@/i18n/core";
import { useLocale, useT } from "@/i18n/react";

function Row({ id, depth, collapsed, toggle }: { id: NodeId; depth: number; collapsed: Set<string>; toggle: (id: string) => void }) {
  const { locale, t } = useLocale();
  const node = useStudio((s) => s.doc?.nodes[id]);
  const rootId = useStudio((s) => s.doc?.rootId);
  const selected = useStudio((s) => s.selectedId === id);
  const hovered = useStudio((s) => s.hoveredId === id);
  const { select, hover, rename, remove, duplicate } = useStudio.getState();
  const [editing, setEditing] = React.useState(false);
  const isRoot = id === rootId;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `layer:${id}`, data: { kind: "move", nodeId: id }, disabled: isRoot || editing });
  if (!node) return null;
  const brick = findBrick(node.brick);
  const slots = Object.entries(node.slots);
  const hasChildren = slots.some(([, ids]) => ids.length > 0) || slots.length > 1;
  const isCollapsed = collapsed.has(id);
  const multiSlot = slots.length > 1;

  return (
    <li>
      <div
        ref={setNodeRef}
        data-tree-id={id}
        onClick={() => select(id)}
        onMouseEnter={() => hover(id)}
        onMouseLeave={() => hover(null)}
        onDoubleClick={() => setEditing(true)}
        className={`group flex h-7 cursor-default items-center gap-1 rounded-md pr-1 text-[13px] ${
          selected ? "bg-primary text-primary-foreground" : hovered ? "bg-muted" : "hover:bg-muted"
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: 4 + depth * 14 }}
        role="treeitem"
        aria-selected={selected}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
      >
        <button
          type="button"
          className={`flex size-4 items-center justify-center ${hasChildren ? "" : "invisible"}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle(id);
          }}
          aria-label={isCollapsed ? t("Expand") : t("Collapse")}
        >
          <ChevronRight className={`size-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
        </button>
        {!isRoot && (
          <span {...attributes} {...listeners} className="hidden cursor-grab text-current opacity-50 group-hover:inline" aria-label={t("Move")}>
            <GripVertical className="size-3" />
          </span>
        )}
        <BrickIcon name={brick?.icon ?? "Box"} className="size-3.5 shrink-0 opacity-70" />
        {editing ? (
          <input
            autoFocus
            defaultValue={node.name}
            className="h-5 min-w-0 flex-1 rounded border bg-background px-1 text-[13px] text-foreground outline-none"
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              rename(id, e.target.value.trim() || node.name);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{translateNodeName(locale, node.name)}</span>
        )}
        {!isRoot && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 opacity-0 group-hover:opacity-70 hover:opacity-100 data-[state=open]:opacity-100" aria-label={t("Actions for {name}", { name: translateNodeName(locale, node.name) })}>
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil /> {t("Rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => duplicate(id)}>
                <Copy /> {t("Duplicate")} <span className="ml-auto text-xs opacity-60">Ctrl+D</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => remove(id)}>
                <Trash2 /> {t("Delete")} <span className="ml-auto text-xs opacity-60">{t("Del")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {!isCollapsed && slots.length > 0 && (
        <ul role="group">
          {slots.map(([slot, ids]) => (
            <React.Fragment key={slot}>
              {multiSlot && (
                <li
                  data-tree-slot={`${id}:${slot}`}
                  className="flex h-6 items-center text-[11px] text-muted-foreground uppercase tracking-wide"
                  style={{ paddingLeft: 22 + (depth + 1) * 14 }}
                >
                  {t(brick?.slots?.[slot]?.label ?? slot)}
                  {!ids.length && <span className="ml-1 normal-case tracking-normal opacity-60">— {t("empty")}</span>}
                </li>
              )}
              {ids.map((cid) => (
                <Row key={cid} id={cid} depth={depth + (multiSlot ? 2 : 1)} collapsed={collapsed} toggle={toggle} />
              ))}
            </React.Fragment>
          ))}
        </ul>
      )}
    </li>
  );
}

export function LayerTree() {
  const t = useT();
  const rootId = useStudio((s) => s.doc?.rootId);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  if (!rootId) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t("Layers")}</h2>
        <span className="text-[11px] text-muted-foreground">{t("double-click: rename")}</span>
      </div>
      <ul data-forge-tree role="tree" aria-label={t("Layers")} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <Row id={rootId} depth={0} collapsed={collapsed} toggle={toggle} />
      </ul>
    </div>
  );
}
