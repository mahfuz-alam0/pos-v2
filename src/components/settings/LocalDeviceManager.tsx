"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";
import { isTauriDesktop } from "@/lib/update-check";
import { listLocalPrinters, type LocalPrinter } from "@/services/printClients/localPrinters";
import {
  getConnectedUserPrintPreference,
  setConnectedUserPrintPreference,
  deleteConnectedUserPrintPreference,
  type ConnectedDeviceProps,
  type ConnectedPrintJobType,
} from "@/services/printClients/connectedUserPrintPreference";
import { JOB_TYPES, getJobTypeLabel, getJobTypeTabLabel } from "@/hooks/usePrintClients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const PRINTER_STATUS_STYLES: Record<LocalPrinter["status"], { dot: string; label: string }> = {
  idle: { dot: "bg-green-500", label: "Ready" },
  printing: { dot: "bg-blue-500", label: "Printing" },
  disabled: { dot: "bg-red-500", label: "Disabled" },
  unknown: { dot: "bg-muted-foreground/40", label: "Unknown" },
};

// A saved connected-user-print-preference stores raw deviceProps, not an id —
// this is how a listed OS printer is matched back to "this is the one saved
// as the preference for this job type".
function isSavedPreference(preference: ConnectedDeviceProps | null | undefined, printerName: string) {
  return Boolean(preference) && (preference?.deviceName ?? null) === printerName;
}

// Local tab: unlike Remote (PrinterDeviceSetup, which lists devices
// registered with the hardware-client relay), this lists the printers
// actually connected to/installed on this machine — read straight from the
// OS (see list_local_printers in src-tauri/src/lib.rs) since there's no
// browser API for that. Only available in the Tauri desktop build. Picking
// one and saving writes its deviceProps directly to
// /connected-user-print-preference, distinct from the /user-print-preference
// endpoints the Remote tab uses.
export default function LocalDeviceManager() {
  const { shopId } = useShop();
  const { printType, setPrintType } = useSettings();
  const active = printType !== "hardware";
  const isDesktop = isTauriDesktop();

  const [activeJobType, setActiveJobType] = useState<string>(JOB_TYPES.PACKAGE_LABEL);
  const [printers, setPrinters] = useState<LocalPrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // jobType -> printer name currently selected in the list (starts out equal
  // to the saved preference, if any, but can be changed before saving).
  const [selectedNames, setSelectedNames] = useState<Record<string, string>>({});
  // jobType -> saved preference's deviceProps, loaded from
  // /connected-user-print-preference/get-preference.
  const [preferences, setPreferences] = useState<Record<string, ConnectedDeviceProps | null>>({});

  const [saveLoading, setSaveLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listLocalPrinters()
      .then((list) => {
        if (!cancelled) setPrinters(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to list local printers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  // Load the saved preference for the active tab.
  useEffect(() => {
    if (!shopId || !isDesktop) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await getConnectedUserPrintPreference(shopId, activeJobType as ConnectedPrintJobType);
        if (cancelled) return;
        const deviceProps = res?.success ? (res?.data?.deviceProps ?? null) : null;
        setPreferences((prev) => ({ ...prev, [activeJobType]: deviceProps }));
        if (deviceProps?.deviceName) {
          setSelectedNames((prev) => ({ ...prev, [activeJobType]: deviceProps.deviceName as string }));
        }
      } catch (err) {
        if (cancelled) return;
        // 404 just means no preference has been saved yet for this job type — not an error.
        if (err?.status !== 404) {
          console.error("Failed to load print preference:", err);
        }
        setPreferences((prev) => ({ ...prev, [activeJobType]: null }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, isDesktop, activeJobType]);

  const hasCurrentPreference = Boolean(preferences[activeJobType]);

  async function handleSavePreference() {
    const printerName = selectedNames[activeJobType];
    if (!printerName) {
      toast.warning("Please select a printer first");
      return;
    }
    const printer = printers.find((p) => p.name === printerName);

    setSaveLoading(true);
    try {
      const deviceProps: ConnectedDeviceProps = {
        ipAddress: null,
        deviceName: printerName,
        port: null,
        meta: printer ? { status: printer.status } : null,
      };
      await setConnectedUserPrintPreference({ shopId, jobType: activeJobType as ConnectedPrintJobType, deviceProps });
      setPreferences((prev) => ({ ...prev, [activeJobType]: deviceProps }));
      toast.success(`${printerName} set as default for ${getJobTypeLabel(activeJobType)}`);
    } catch (err) {
      toast.error(err?.message || "Failed to save printer preference");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleRemovePreference() {
    setRemoveLoading(true);
    try {
      await deleteConnectedUserPrintPreference(shopId, activeJobType as ConnectedPrintJobType);
      setPreferences((prev) => ({ ...prev, [activeJobType]: null }));
      toast.success(`Default removed for ${getJobTypeLabel(activeJobType)}`);
    } catch (err) {
      toast.error(err?.message || "Failed to remove default printer");
    } finally {
      setRemoveLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <span className="flex items-center gap-2 text-sm text-text">
          <span className={`size-2.5 shrink-0 rounded-full ${active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
          {active ? "Active — this device is the print target" : "Not active"}
        </span>
        {!active && (
          <Button size="sm" variant="outline" onClick={() => setPrintType("browser")}>
            Use This Device
          </Button>
        )}
      </div>

      {!isDesktop ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <p>Local printers can only be listed from the desktop app.</p>
          <p className="text-sm">Open Bleaum POS on this device to select one of its connected printers.</p>
        </div>
      ) : (
        <Tabs value={activeJobType} onValueChange={setActiveJobType} className="flex flex-col gap-2">
          <TabsList variant="line" className="w-full flex-nowrap justify-start overflow-x-auto">
            {Object.values(JOB_TYPES).map((jobType) => (
              <TabsTrigger key={jobType} value={jobType} className="flex-none">
                {getJobTypeTabLabel(jobType)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeJobType} className="pt-2">
            {loading ? (
              <div className="flex justify-center p-8 text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="p-4 text-red-500">Error: {error}</div>
            ) : !printers.length ? (
              <div className="flex justify-center p-8 text-muted-foreground">
                No printers connected to this device
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {printers.map((printer) => {
                  const isSelected = selectedNames[activeJobType] === printer.name;
                  const isSaved = isSavedPreference(preferences[activeJobType], printer.name);
                  return (
                    <div
                      key={printer.name}
                      onClick={() => setSelectedNames((prev) => ({ ...prev, [activeJobType]: printer.name }))}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary-soft"
                          : "border-border bg-component-bg hover:bg-surface-alt"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedNames((prev) => ({ ...prev, [activeJobType]: printer.name }))}
                          className="size-4 shrink-0 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="mb-1 text-base font-medium text-text">{printer.name}</h4>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span
                              className={`size-1.5 shrink-0 rounded-full ${
                                (PRINTER_STATUS_STYLES[printer.status] ?? PRINTER_STATUS_STYLES.unknown).dot
                              }`}
                            />
                            <span>{(PRINTER_STATUS_STYLES[printer.status] ?? PRINTER_STATUS_STYLES.unknown).label}</span>
                            {printer.isDefault && <span>· OS default</span>}
                          </div>
                        </div>
                        {isSaved && <Badge className="bg-green-100 text-green-700">Current</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            {hasCurrentPreference && (
              <Button variant="destructive" onClick={handleRemovePreference} disabled={removeLoading}>
                {removeLoading ? "Removing…" : "Remove Preference"}
              </Button>
            )}
            <Button onClick={handleSavePreference} disabled={!selectedNames[activeJobType] || saveLoading}>
              {saveLoading ? "Saving…" : "Save Preference"}
            </Button>
          </div>
        </Tabs>
      )}
    </div>
  );
}
