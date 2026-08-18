"use client";

import { useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import {
  Check,
  Plus,
  Sun,
  Moon,
  Monitor,
  Palette,
  Timer,
  Rows3,
} from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { useSettings } from "@/context/settings-context";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AutomatedPrintingSection from "./AutomatedPrintingSection";

const COLOR_FIELDS = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent (sidebar)" },
];

// Custom in-DOM color field — deliberately not the native <input type="color">.
// The native picker renders as an OS-level surface outside this popover's
// portaled subtree, so it can visually overlap the other rows, and dragging
// inside it registers as an "outside click" to the popover's own dismiss
// logic and closes the whole panel. Keeping everything (gradient box, hue
// slider, hex input) inside our own DOM fixes both.
function ColorField({ label, value, onChange, isOpen, onToggle }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center justify-between gap-3 text-xs text-text">
        {label}
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Pick ${label} color`}
          aria-expanded={isOpen}
          className={`size-7 shrink-0 cursor-pointer rounded-full border transition-transform hover:scale-105 ${isOpen ? "ring-2 ring-primary ring-offset-2 ring-offset-popover" : "border-border"
            }`}
          style={{ backgroundColor: value }}
        />
      </label>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 pt-1 pb-1">
            {/* react-colorful injects its own unlayered <style> tag at mount, which
                beats Tailwind's @layer utilities regardless of specificity — only an
                inline style (highest priority, no layer) reliably overrides its
                default 200x200 box. */}
            <HexColorPicker color={value} onChange={onChange} style={{ width: "100%", height: 180 }} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">#</span>
              <HexColorInput
                color={value}
                onChange={onChange}
                prefixed={false}
                className="h-7 w-full min-w-0 rounded border border-input bg-component-bg px-2 text-xs text-text uppercase outline-none focus:border-primary"
              />
              <Button type="button" size="sm" className="h-7 shrink-0 px-2.5 text-xs" onClick={onToggle}>
                OK
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomThemeSwatch() {
  const { theme, setTheme, customColors, setCustomColors, customThemeId } = useTheme();
  const [draft, setDraft] = useState(customColors);
  const [openField, setOpenField] = useState<string | null>(null);
  const active = theme === customThemeId;

  const apply = () => {
    setCustomColors(draft);
    setTheme(customThemeId);
    setOpenField(null);
  };

  return (
    <Popover>
      <PopoverTrigger
        className="group flex flex-col items-center gap-1.5"
        onClick={() => {
          setDraft(customColors);
          setOpenField(null);
        }}
      >
        <span
          className={`relative flex size-9 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 transition-transform group-hover:scale-105 ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-component-bg" : ""
            }`}
          style={
            active
              ? {
                background: `conic-gradient(${customColors.primary} 0deg 120deg, ${customColors.secondary} 120deg 240deg, ${customColors.accent} 240deg 360deg)`,
                border: "none",
              }
              : undefined
          }
        >
          {active ? (
            <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
          ) : (
            <Plus className="size-4 text-muted-foreground" />
          )}
        </span>
        <span className={`text-[11px] ${active ? "font-medium text-primary" : "text-muted-foreground"}`}>
          Custom
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex flex-col gap-2.5">
          {COLOR_FIELDS.map(({ key, label }) => (
            <ColorField
              key={key}
              label={label}
              value={draft[key]}
              onChange={(color) => setDraft((d) => ({ ...d, [key]: color }))}
              isOpen={openField === key}
              onToggle={() => setOpenField((k) => (k === key ? null : key))}
            />
          ))}
          <Button type="button" size="sm" onClick={apply} className="mt-1">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const MODE_META = {
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
  system: { label: "System", icon: Monitor },
};

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-border bg-component-bg p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function PersonalizeTab() {
  const { theme, setTheme, themes, mode, setMode, modes } = useTheme();
  const {
    queueBorder15,
    queueBorder20,
    queueYellowTime,
    queueRedTime,
    defaultPageSize,
    setQueueBorder15,
    setQueueBorder20,
    setQueueYellowTime,
    setQueueRedTime,
    setDefaultPageSize,
  } = useSettings();

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        icon={Palette}
        title="Appearance"
        description="Pick an accent color and choose how the interface adapts to lighting."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {themes.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`relative flex size-9 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${active
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-component-bg"
                      : ""
                      }`}
                    style={{
                      background: `conic-gradient(${t.primary} 0deg 120deg, ${t.secondary} 120deg 240deg, ${t.accent} 240deg 360deg)`,
                    }}
                  >
                    {active && (
                      <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                    )}
                  </span>
                  <span
                    className={`text-[11px] ${active ? "font-medium text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
            <CustomThemeSwatch />
          </div>

          <div className="flex rounded-lg bg-surface-alt p-1">
            {modes.map((m) => {
              const { label, icon: Icon } = MODE_META[m] ?? { label: m, icon: Monitor };
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  suppressHydrationWarning
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${active
                    ? "bg-component-bg font-medium text-text shadow-sm"
                    : "text-muted-foreground hover:text-text"
                    }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Timer}
        title="Queue Alerts"
        description="Highlight waiting customers once they pass a time threshold."
      >
        <div className="flex flex-col divide-y divide-border">
          <div
            className={`flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 ${queueBorder15 ? "" : "opacity-60"
              }`}
          >
            <span className="flex items-center gap-2 text-sm text-text">
              <span className="size-2.5 shrink-0 rounded-full bg-yellow-400" />
              Yellow border after
              <Input
                type="number"
                value={queueYellowTime}
                disabled={!queueBorder15}
                onChange={(e) => setQueueYellowTime(parseInt(e.target.value, 10) || 0)}
                className="h-8 w-17.5"
              />
              mins
            </span>
            <Switch checked={queueBorder15} onCheckedChange={setQueueBorder15} />
          </div>

          <div
            className={`flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 ${queueBorder20 ? "" : "opacity-60"
              }`}
          >
            <span className="flex items-center gap-2 text-sm text-text">
              <span className="size-2.5 shrink-0 rounded-full bg-red-500" />
              Red border after
              <Input
                type="number"
                value={queueRedTime}
                disabled={!queueBorder20}
                onChange={(e) => setQueueRedTime(parseInt(e.target.value, 10) || 0)}
                className="h-8 w-17.5"
              />
              mins
            </span>
            <Switch checked={queueBorder20} onCheckedChange={setQueueBorder20} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Rows3}
        title="Table Defaults"
        description="Choose the default number of rows shown per page across tables."
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text">Default rows per page</span>
          <Select
            items={[30, 50, 100, 200].map((s) => ({ value: String(s), label: `${s} rows` }))}
            value={String(defaultPageSize)}
            onValueChange={(v) => setDefaultPageSize(Number(v))}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[30, 50, 100, 200].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <AutomatedPrintingSection />
    </div>
  );
}
