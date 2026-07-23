"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-width drawer sliding from the top (ported from old POS AnimatedDrawer).
 * min-height 40vh, max-height 95vh, sticky header, dark overlay.
 */
export default function AnimatedDrawer({
  open,
  onClose,
  title,
  children,
  width = "100%",
  height,
  placement = "top", // "top" | "right"
  zIndex = 70,
}: { open: boolean; onClose: () => void; title?: React.ReactNode; children?: React.ReactNode; width?: string | number; height?: string | number; placement?: "top" | "right"; zIndex?: number }) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setIsMounted(false);
    }, 300);
  }

  useEffect(() => {
    if (open) {
      setIsClosing(false);
      const t = setTimeout(() => setIsMounted(true), 10);
      return () => clearTimeout(t);
    }
    setIsMounted(false);
  }, [open]);

  if (!open && !isClosing) return null;

  const hidden = isClosing || !isMounted;
  const transform =
    placement === "right"
      ? hidden
        ? "translateX(100%)"
        : "translateX(0)"
      : hidden
        ? "translateY(-100%)"
        : "translateY(0)";

  const containerStyle =
    placement === "right"
      ? { top: 0, right: 0, bottom: 0, width, zIndex: zIndex + 1, transform }
      : { top: 0, left: 0, right: 0, width, ...(height ? { height } : {}), zIndex: zIndex + 1, transform };

  // Portal to <body>: ancestors with CSS transforms (e.g. sliding side panels)
  // would otherwise trap position:fixed and clip the drawer to their box.
  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-300 ease-in-out"
        style={{ zIndex, opacity: hidden ? 0 : 1 }}
        onClick={handleClose}
      />

      <div
        className={`fixed overflow-y-auto bg-component-bg shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out ${
          placement === "right" ? "max-h-screen min-h-screen" : "max-h-[95vh] min-h-[40vh]"
        }`}
        style={containerStyle}
      >
        <div className="sticky top-0 z-1 flex items-center justify-between border-b border-border bg-component-bg px-6 py-4">
          <h3 className="m-0 text-base font-semibold text-text">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={handleClose}>
            <X />
          </Button>
        </div>

        <div className="px-7.5 py-5">{children}</div>
      </div>
    </>,
    document.body
  );
}
