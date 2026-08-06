"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{label}</span>
      <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input">
        <div className="relative h-full w-11 shrink-0 border-r border-input" style={{ background: value || "#000000" }}>
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-none p-0 opacity-0"
          />
        </div>
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-full flex-1 border-none bg-transparent px-3 font-mono text-[13px] shadow-none focus-visible:shadow-none"
        />
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{label}</span>
      {multiline ? (
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className="text-[13px] leading-relaxed" />
      ) : (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-9 text-[13px]" />
      )}
    </div>
  );
}

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
      <div className="h-px flex-1 bg-border" />
      <span>{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function GroupCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[10px] bg-muted/40 px-5 pt-5 pb-4">{children}</div>;
}

interface CtaValue {
  label?: string | null;
  href?: string | null;
  textColor?: string | null;
  bgColor?: string | null;
}

export function CtaBlock({
  title,
  value = {},
  onChange,
  showColors = false,
}: {
  title: string;
  value?: CtaValue;
  onChange: (value: CtaValue) => void;
  showColors?: boolean;
}) {
  return (
    <div className="rounded-[10px] bg-background px-4.5 py-4 ring-1 ring-foreground/10">
      <span className="mb-3.5 block text-xs font-bold">{title}</span>
      <div className="flex flex-col gap-3.5">
        <TextField label="Label" value={value.label} onChange={(v) => onChange({ ...value, label: v })} />
        <TextField label="Href" value={value.href} onChange={(v) => onChange({ ...value, href: v })} />
        {showColors && (
          <>
            <ColorField label="Text Color" value={value.textColor} onChange={(v) => onChange({ ...value, textColor: v })} />
            <ColorField label="Background Color" value={value.bgColor} onChange={(v) => onChange({ ...value, bgColor: v })} />
          </>
        )}
      </div>
    </div>
  );
}
