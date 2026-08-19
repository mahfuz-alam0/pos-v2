"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isTauriDesktop } from "@/lib/update-check";
import PrinterDeviceSetup from "./PrinterDeviceSetup";
import LocalDeviceManager from "./LocalDeviceManager";

const DRAWER_WIDTH = 760;
// Stacks above the Settings drawer (zIndex 50, its default) but below the
// nested layers opened from within (Test Print Dialog at the framework
// default z-60) — see that file for the full stacking order.
const DRAWER_Z_INDEX = 55;

export default function PrinterSetupDrawer({ open, onClose, onSelect }) {
  const [tab, setTab] = useState("local");

  // Default to the browser-build behavior on both server and first client
  // render, then switch after mount — matching the SSR markup avoids a
  // hydration mismatch (window.__TAURI_INTERNALS__ only exists client-side).
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(isTauriDesktop());
  }, []);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      size={DRAWER_WIDTH}
      zIndex={DRAWER_Z_INDEX}
      className="flex flex-col"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-heading">Automated Printing Setup</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close printer setup"
          className="text-sidebar-text hover:text-text"
        >
          ✕
        </button>
      </div>

      {isDesktop ? (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col px-5 pt-3">
          <TabsList variant="line" className="w-full shrink-0 justify-start">
            <TabsTrigger value="local">Local</TabsTrigger>
            <TabsTrigger value="remote">Remote</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="min-h-0 flex-1 overflow-y-auto py-3">
            <LocalDeviceManager onSelect={onSelect} />
          </TabsContent>

          <TabsContent value="remote" className="flex min-h-0 flex-1 flex-col py-3">
            <PrinterDeviceSetup onSelect={onSelect} onCancel={onClose} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-5 py-3">
          <PrinterDeviceSetup onSelect={onSelect} onCancel={onClose} />
        </div>
      )}
    </Drawer>
  );
}
