"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme-context";
import { useSettings } from "@/context/settings-context";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PrinterSelectionModal from "./PrinterSelectionModal";

const POS_VIEW_OPTIONS = [
  { value: "regular", label: "Computer View" },
  { value: "tablet", label: "Tablet View" },
];

export default function PersonalizeTab({ onClose }) {
  const router = useRouter();
  const { theme, setTheme, themes, mode, setMode, modes } = useTheme();
  const {
    queueBorder15,
    queueBorder20,
    queueYellowTime,
    queueRedTime,
    posMode,
    printType,
    setQueueBorder15,
    setQueueBorder20,
    setQueueYellowTime,
    setQueueRedTime,
    setPosMode,
    setPrintType,
  } = useSettings();
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  function handlePosViewChange(value) {
    setPosMode(value);
    router.push(value === "tablet" ? "/sales" : "/pos");
    onClose?.();
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-sidebar-text uppercase">
          Theme Color
        </h3>
        <div className="flex flex-wrap gap-3 overflow-visible p-1">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              title={t.label}
              className={`h-10 w-10 shrink-0 rounded-full ring-offset-2 ring-offset-component-bg ${
                theme === t.id ? "ring-2 ring-primary" : ""
              }`}
              style={{
                background: `linear-gradient(135deg, ${t.primary} 50%, ${t.secondary} 50%)`,
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-sidebar-text uppercase">
          Mode
        </h3>
        <div className="flex gap-2">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${
                mode === m
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-text hover:bg-surface-alt"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-sidebar-text uppercase">
          Queue Settings
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={queueBorder15} onCheckedChange={setQueueBorder15} />
            <span className="flex items-center gap-2 text-sm text-text">
              Show yellow border after
              <Input
                type="number"
                value={queueYellowTime}
                onChange={(e) => setQueueYellowTime(parseInt(e.target.value, 10) || 0)}
                className="w-17.5"
              />
              mins
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={queueBorder20} onCheckedChange={setQueueBorder20} />
            <span className="flex items-center gap-2 text-sm text-text">
              Show red border after
              <Input
                type="number"
                value={queueRedTime}
                onChange={(e) => setQueueRedTime(parseInt(e.target.value, 10) || 0)}
                className="w-17.5"
              />
              mins
            </span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-sidebar-text uppercase">
          Default Point-of-Sale Screen
        </h3>
        <Select value={posMode} onValueChange={handlePosViewChange}>
          <SelectTrigger className="w-1/2">
            <SelectValue placeholder="Select View" />
          </SelectTrigger>
          <SelectContent>
            {POS_VIEW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-sidebar-text uppercase">
          Default Print Type
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant={printType === "hardware" ? "default" : "outline"}
            onClick={() => {
              setPrinterModalOpen(true);
              onClose?.();
            }}
          >
            {printType === "hardware" ? "Automated Printing On" : "Configure automated printing"}
          </Button>
          {printType === "hardware" && (
            <Button variant="outline" onClick={() => setPrintType("browser")}>
              Turn Off
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-sidebar-text">
          Select a printer device per print job type. Saving a preference enables automated hardware printing.
        </p>
      </section>

      <PrinterSelectionModal
        open={printerModalOpen}
        onOpenChange={setPrinterModalOpen}
        onSelect={() => setPrintType("hardware")}
      />
    </div>
  );
}
