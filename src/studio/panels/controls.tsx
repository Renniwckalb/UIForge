"use client";
import * as React from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useT } from "@/i18n/react";

export function Section({ title, children, defaultOpen = true, aside }: { title: string; children: React.ReactNode; defaultOpen?: boolean; aside?: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b">
      <div className="flex items-center pr-3">
        <CollapsibleTrigger className="flex h-9 flex-1 items-center gap-1.5 px-3 text-left text-[12px] font-semibold">
          <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
          {title}
        </CollapsibleTrigger>
        {aside}
      </div>
      <CollapsibleContent className="flex flex-col gap-2.5 px-3 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function Field({ label, children, hint, onReset, htmlFor, badge }: { label: string; children: React.ReactNode; hint?: string; onReset?: () => void; htmlFor?: string; badge?: string }) {
  const t = useT();
  return (
    <div className="grid grid-cols-[92px_1fr] items-start gap-2">
      <label htmlFor={htmlFor} className="flex min-h-7 items-center gap-1 text-[12px] text-muted-foreground" title={hint}>
        <span className="truncate">{label}</span>
        {badge && <span className="rounded bg-[#2563eb] px-1 font-mono text-[9px] leading-[14px] font-semibold text-white uppercase" title={t("Value overridden at {bp}", { bp: badge })}>{badge}</span>}
        {onReset && (
          <button type="button" onClick={onReset} className="rounded p-0.5 text-muted-foreground/70 hover:text-foreground" title={t("Reset")} aria-label={t("Reset {name}", { name: label })}>
            <RotateCcw className="size-3" />
          </button>
        )}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  id,
  renderOption,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  id?: string;
  renderOption?: (o: { value: string; label: string }) => React.ReactNode;
}) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger id={id} size="sm" className="h-7 w-full text-[12px]">
        <SelectValue placeholder={placeholder ?? "—"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[12px]">
            {renderOption ? renderOption(o) : o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Segmented({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: React.ReactNode; title?: string }[]; ariaLabel: string }) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      aria-label={ariaLabel}
      className="w-full"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} title={o.title} className="h-7 flex-1 px-1.5 text-[11px]">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function SliderInput({ value, min, max, step, onChange, format }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="flex h-7 items-center gap-2">
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" />
      <span className="w-12 text-right text-[11px] text-muted-foreground tabular-nums">{format ? format(value) : value}</span>
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-7 w-full min-w-0 rounded-md border bg-background px-2 text-[12px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 ${props.className ?? ""}`}
    />
  );
}

/** Champ texte qui ne pousse sa valeur qu'à la frappe (évite les sauts de curseur quand le modèle change) */
export function BufferedInput({ value, onCommit, ...rest }: { value: string; onCommit: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [local, setLocal] = React.useState(value);
  const focused = React.useRef(false);
  React.useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);
  return (
    <TextInput
      {...rest}
      value={local}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setLocal(value);
      }}
      onChange={(e) => {
        setLocal(e.target.value);
        onCommit(e.target.value);
      }}
    />
  );
}

export function ColorSwatch({ color, className = "" }: { color: string; className?: string }) {
  return <span className={`inline-block size-3.5 shrink-0 rounded-sm border border-black/10 ${className}`} style={{ background: color }} aria-hidden />;
}

/** Sélecteur de couleur natif + saisie hex */
export function ColorInput({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  const t = useT();
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="flex h-7 items-center gap-1.5">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className="h-7 w-8 shrink-0 cursor-pointer rounded border bg-background p-0.5" />
      <BufferedInput value={value} onCommit={onChange} aria-label={t("{name} (value)", { name: ariaLabel })} className="font-mono" />
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">{children}</div>;
}
