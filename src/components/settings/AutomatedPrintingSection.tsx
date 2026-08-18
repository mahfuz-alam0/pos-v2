"use client";

import { useEffect, useState } from "react";
import { Printer, Laptop, Server } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { Button } from "@/components/ui/button";
import { isTauriDesktop } from "@/lib/update-check";
import PrinterSelectionModal from "./PrinterSelectionModal";

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

const DEVICE_OPTIONS = [
  { id: "local", label: "Local Device", icon: Laptop, description: "Print from this computer" },
  { id: "remote", label: "Remote Device", icon: Server, description: "Print via a paired hardware client" },
];

function DeviceModeToggle({ mode, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {DEVICE_OPTIONS.map(({ id, label, icon: Icon, description }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={active}
            className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
              }`}
          >
            <span className={`flex items-center gap-1.5 text-sm font-medium ${active ? "text-primary" : "text-text"}`}>
              <Icon className="size-4" />
              {label}
            </span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AutomatedPrintingSection() {
  const { printType, setPrintType } = useSettings();
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  // Default to the browser-build layout on both server and first client render,
  // then switch to the Tauri layout post-mount — matching the SSR markup avoids
  // a hydration mismatch (window.__TAURI_INTERNALS__ only exists client-side).
  const [isTauri, setIsTauri] = useState(false);
  useEffect(() => {
    setIsTauri(isTauriDesktop());
  }, []);

  const deviceMode = printType === "hardware" ? "remote" : "local";

  function handleDeviceSelect(id) {
    if (id === "local") {
      setPrintType("browser");
    } else {
      setPrinterModalOpen(true);
    }
  }

  if (isTauri) {
    return (
      <SectionCard
        icon={Printer}
        title="Automated Printing"
        description="Choose whether print jobs go to this device or a paired remote print client."
      >
        <div className="flex flex-col gap-3">
          <DeviceModeToggle mode={deviceMode} onSelect={handleDeviceSelect} />

          {deviceMode === "remote" && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-alt px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-text">
                <span
                  className={`size-2.5 rounded-full ${printType === "hardware" ? "bg-green-500" : "bg-muted-foreground/40"
                    }`}
                />
                {printType === "hardware" ? "Configured" : "Not configured yet"}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant={printType === "hardware" ? "outline" : "default"}
                  onClick={() => setPrinterModalOpen(true)}
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
          )}
        </div>

        <PrinterSelectionModal
          open={printerModalOpen}
          onOpenChange={setPrinterModalOpen}
          onSelect={() => setPrintType("hardware")}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={Printer}
      title="Automated Printing"
      description="Select a printer device per print job type. Saving a preference enables automated hardware printing."
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-text">
          <span
            className={`size-2.5 rounded-full ${printType === "hardware" ? "bg-green-500" : "bg-muted-foreground/40"
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
            onClick={() => setPrinterModalOpen(true)}
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

      <PrinterSelectionModal
        open={printerModalOpen}
        onOpenChange={setPrinterModalOpen}
        onSelect={() => setPrintType("hardware")}
      />
    </SectionCard>
  );
}
