"use client";

import { useState } from "react";
import {
  Check,
  Plus,
  Sun,
  Moon,
  Monitor,
  Palette,
  Timer,
  Printer,
} from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { useSettings } from "@/context/settings-context";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PrinterSelectionModal from "./PrinterSelectionModal";

const COLOR_FIELDS = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent (sidebar)" },
];

function CustomThemeSwatch() {
  const { theme, setTheme, customColors, setCustomColors, customThemeId } = useTheme();
  const [draft, setDraft] = useState(customColors);
  const active = theme === customThemeId;

  const apply = () => {
    setCustomColors(draft);
    setTheme(customThemeId);
  };

  return (
    <Popover>
      <PopoverTrigger
        className="group flex flex-col items-center gap-1.5"
        onClick={() => setDraft(customColors)}
      >
        <span
          className={`relative flex size-9 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 transition-transform group-hover:scale-105 ${
            active ? "ring-2 ring-primary ring-offset-2 ring-offset-component-bg" : ""
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
      <PopoverContent align="start" className="w-56">
        <div className="flex flex-col gap-2.5">
          {COLOR_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-3 text-xs text-text">
              {label}
              <input
                type="color"
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="size-7 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </label>
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

export default function PersonalizeTab({ onClose }) {
  const { theme, setTheme, themes, mode, setMode, modes } = useTheme();
  const {
    queueBorder15,
    queueBorder20,
    queueYellowTime,
    queueRedTime,
    printType,
    setQueueBorder15,
    setQueueBorder20,
    setQueueYellowTime,
    setQueueRedTime,
    setPrintType,
  } = useSettings();
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

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
                    className={`relative flex size-9 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${
                      active
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
                    className={`text-[11px] ${
                      active ? "font-medium text-primary" : "text-muted-foreground"
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
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
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
            className={`flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 ${
              queueBorder15 ? "" : "opacity-60"
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
            className={`flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 ${
              queueBorder20 ? "" : "opacity-60"
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
        icon={Printer}
        title="Automated Printing"
        description="Select a printer device per print job type. Saving a preference enables automated hardware printing."
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-text">
            <span
              className={`size-2.5 rounded-full ${
                printType === "hardware" ? "bg-green-500" : "bg-muted-foreground/40"
              }`}
              suppressHydrationWarning
            />
            <span suppressHydrationWarning>
              {printType === "hardware" ? "On — printing to hardware devices" : "Off — using browser print"}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant={printType === "hardware" ? "outline" : "default"}
              suppressHydrationWarning
              onClick={() => {
                setPrinterModalOpen(true);
                onClose?.();
              }}
            >
              {printType === "hardware" ? "Configure" : "Set up"}
            </Button>
            {printType === "hardware" && (
              <Button size="sm" variant="outline" onClick={() => setPrintType("browser")}>
                Turn Off
              </Button>
            )}
          </div>
        </div>
      </SectionCard>

      <PrinterSelectionModal
        open={printerModalOpen}
        onOpenChange={setPrinterModalOpen}
        onSelect={() => setPrintType("hardware")}
      />
    </div>
  );
}
