"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
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
const DRAG_THRESHOLD_PX = 5;

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
  const startPosRef = useRef({ x: 0, y: 0 });

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
    startPosRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = e.clientY - (top ?? 0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      movedRef.current = true;
      setIsDragging(true);
    }
    if (movedRef.current) {
      setTop(clampTop(e.clientY - dragOffsetRef.current));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (movedRef.current) {
      setTop((current) => {
        if (current !== null) localStorage.setItem(POSITION_STORAGE_KEY, String(current));
        return current;
      });
    }
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
          isDragging ? "cursor-grabbing" : "cursor-pointer"
        }`}
        style={{
          top: top ?? "25%",
          transform: `translateY(-50%) translateX(${open ? -DRAWER_WIDTH : 0}px)`,
          visibility: top === null ? "hidden" : "visible",
        }}
      >
        <Settings className="size-5 animate-gear-spin" />
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
            <PersonalizeTab />
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
