"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/context/settings-context";
import Drawer from "@/components/ui/Drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PersonalizeTab from "./PersonalizeTab";
import VerifyTab from "./VerifyTab";
import CustomerQueue from "@/components/dashboard/CustomerQueue";

const DRAWER_WIDTH = 660;
const HIDDEN_PATHS = ["/signin"];

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("personalize");
  const { labMode } = useSettings();
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close settings" : "Open settings"}
        className="fixed top-1/4 right-0 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-l-full bg-primary text-on-primary shadow-lg transition-transform duration-300 ease-in-out hover:bg-primary-hover"
        style={{
          transform: `translateY(-50%) translateX(${open ? -DRAWER_WIDTH : 0}px)`,
        }}
      >
        <GearIcon />
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} side="right" size={DRAWER_WIDTH} className="flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-heading">Settings</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close settings"
            className="text-sidebar-text hover:text-text"
          >
            ✕
          </button>
        </div>

        <Tabs
          value={section}
          onValueChange={setSection}
          className="flex min-h-0 flex-1 flex-col px-5 pt-3"
        >
          <TabsList variant="line" className="w-full shrink-0 justify-start">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            {labMode && <TabsTrigger value="activity">Activity</TabsTrigger>}
            <TabsTrigger value="personalize">Personalize</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="min-h-0 flex-1 overflow-hidden py-4">
            <CustomerQueue sidepanel />
          </TabsContent>

          {labMode && (
            <TabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto py-4">
              <ActivityTabPlaceholder />
            </TabsContent>
          )}

          <TabsContent value="personalize" className="min-h-0 flex-1 overflow-y-auto py-4">
            <PersonalizeTab onClose={() => setOpen(false)} />
          </TabsContent>

          <TabsContent value="verify" className="min-h-0 flex-1 overflow-y-auto py-4">
            <VerifyTab />
          </TabsContent>
        </Tabs>
      </Drawer>
    </>
  );
}

function ActivityTabPlaceholder() {
  return <div className="text-sm text-sidebar-text">Activity tab — coming next.</div>;
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.14.5.6.9 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
