"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/context/settings-context";
import Drawer from "@/components/ui/Drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PersonalizeTab from "./PersonalizeTab";
import VerifyTab from "./VerifyTab";
import CustomerQueue from "@/components/dashboard/CustomerQueue";

const DRAWER_WIDTH = 660;
const HIDDEN_PATHS = ["/signin"];
const POSITION_STORAGE_KEY = "settingsFabTop";
const DEFAULT_TOP_RATIO = 0.25;

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("personalize");
  const { labMode } = useSettings();
  const pathname = usePathname();

  const [top, setTop] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    const stored = Number(localStorage.getItem(POSITION_STORAGE_KEY));
    setTop(Number.isFinite(stored) && stored > 0 ? stored : window.innerHeight * DEFAULT_TOP_RATIO);
  }, []);

  const clampTop = (value: number) => {
    const buttonHeight = 44;
    return Math.min(Math.max(value, 8), window.innerHeight - buttonHeight - 8);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = true;
    movedRef.current = false;
    setIsDragging(true);
    dragOffsetRef.current = e.clientY - (top ?? 0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    movedRef.current = true;
    setTop(clampTop(e.clientY - dragOffsetRef.current));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    setTop((current) => {
      if (current !== null) localStorage.setItem(POSITION_STORAGE_KEY, String(current));
      return current;
    });
  };

  const handleClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen((v) => !v);
  };

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label={open ? "Close settings" : "Open settings"}
        className={`fixed right-0 z-50 flex h-11 w-14 touch-none items-center justify-center rounded-l-full bg-primary text-on-primary shadow-lg transition-[transform,background-color] duration-300 ease-in-out hover:bg-primary-hover ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          top: top ?? "25%",
          transform: `translateY(-50%) translateX(${open ? -DRAWER_WIDTH : 0}px)`,
          visibility: top === null ? "hidden" : "visible",
        }}
      >
        <GearIcon spinning={open} />
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

function GearIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.14.5.6.9 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
