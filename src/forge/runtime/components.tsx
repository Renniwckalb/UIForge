"use client";
/**
 * Association tag JSX → composant réel. Ce sont les vraies bibliothèques installées
 * (sources shadcn/Magic UI copiées dans src/vendor, paquets npm cmdk/NumberFlow/Radix/Base UI).
 */
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

/** Résout "Drawer.Root" → composant, "div" → "div" */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveTag(tag: string): any {
  if (/^[a-z]/.test(tag)) return tag;
  const [head, ...rest] = tag.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = COMPONENTS[head];
  for (const r of rest) cur = cur?.[r];
  return cur ?? null;
}
