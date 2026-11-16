"use client";
/**
 * Association tag JSX → composant réel. Ce sont les vraies bibliothèques installées
 * (sources shadcn/Magic UI copiées dans src/vendor, paquets npm cmdk/NumberFlow/Radix/Base UI).
 */
import * as React from "react";
import type { ComponentType } from "react";
import { Button } from "@/vendor/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/vendor/ui/card";
import { Input } from "@/vendor/ui/input";
import { Textarea } from "@/vendor/ui/textarea";
import { Label } from "@/vendor/ui/label";
import { Badge } from "@/vendor/ui/badge";
import { Separator } from "@/vendor/ui/separator";
import { Switch } from "@/vendor/ui/switch";
import { Checkbox } from "@/vendor/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/vendor/ui/dialog";
import { Collapsible } from "radix-ui";
import { Tooltip } from "@base-ui/react/tooltip";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { Command } from "cmdk";
import NumberFlow from "@number-flow/react";
import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";
import { DESIGNED_COMPONENTS } from "./designed-components";
import { canonicalIcon } from "../icons/lucide";
import { getLucideIcon, loadLucideIcons, lucideIconsLoaded, subscribeLucideIcons } from "./icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any> | Record<string, unknown>;

export const COMPONENTS: Record<string, AnyComponent> = {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Label,
  Badge,
  Separator,
  Switch,
  Checkbox,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Collapsible: Collapsible as unknown as Record<string, unknown>,
  Tooltip: Tooltip as unknown as Record<string, unknown>,
  Popover: Popover as unknown as Record<string, unknown>,
  Drawer: Drawer as unknown as Record<string, unknown>,
  Command: Command as unknown as AnyComponent,
  NumberFlow,
  ChevronDownIcon,
  LoaderCircleIcon,
  ...DESIGNED_COMPONENTS,
};

/** Icône Lucide (brique lucide.icon) : rendue dès que les icônes sont chargées, emplacement vide en attendant */
const iconComponents = new Map<string, ComponentType<Record<string, unknown>>>();
function lucideComponent(name: string) {
  let C = iconComponents.get(name);
  if (C) return C;
  C = function ForgeLucideIcon(props: Record<string, unknown>) {
    const loaded = React.useSyncExternalStore(subscribeLucideIcons, lucideIconsLoaded, lucideIconsLoaded);
    React.useEffect(() => {
      if (!loaded) void loadLucideIcons();
    }, [loaded]);
    const Icon = getLucideIcon(name);
    if (!Icon) {
      const { className, style } = props as { className?: string; style?: React.CSSProperties };
      return <svg className={className} style={style} viewBox="0 0 24 24" width={24} height={24} aria-hidden data-forge-icon-pending="" />;
    }
    return <Icon {...props} />;
  };
  iconComponents.set(name, C);
  return C;
}

/** Résout "Drawer.Root" → composant, "div" → "div", "ArrowRightIcon" → icône Lucide */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveTag(tag: string): any {
  if (/^[a-z]/.test(tag)) return tag;
  const [head, ...rest] = tag.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = COMPONENTS[head];
  for (const r of rest) cur = cur?.[r];
  if (!cur && !rest.length && head.endsWith("Icon")) {
    const name = canonicalIcon(head.slice(0, -4));
    if (name) return lucideComponent(name);
  }
  return cur ?? null;
}
