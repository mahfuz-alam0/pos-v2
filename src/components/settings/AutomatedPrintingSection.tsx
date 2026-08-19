"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { Button } from "@/components/ui/button";
import PrinterSetupDrawer from "./PrinterSetupDrawer";

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

export default function AutomatedPrintingSection() {
  const { printType, setPrintType } = useSettings();
  const [setupOpen, setSetupOpen] = useState(false);

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
            onClick={() => setSetupOpen(true)}
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

      <PrinterSetupDrawer
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSelect={() => setPrintType("hardware")}
      />
    </SectionCard>
  );
}
