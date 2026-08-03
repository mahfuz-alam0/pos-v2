"use client";

import * as React from "react";
import { createPortal } from "react-dom";

const SIDE_CONFIG = {
  right: {
    wrapper: "top-0 right-0 h-full max-w-[100vw]",
    size: (px) => ({ width: px }),
    closedTransform: "translateX(100%)",
  },
  left: {
    wrapper: "top-0 left-0 h-full max-w-[100vw]",
    size: (px) => ({ width: px }),
    closedTransform: "translateX(-100%)",
  },
  top: {
    wrapper: "top-0 left-0 w-full max-h-[85vh]",
    size: (px) => ({ height: px }),
    closedTransform: "translateY(-100%)",
  },
  bottom: {
    wrapper: "bottom-0 left-0 w-full max-h-[85vh]",
    size: (px) => ({ height: px }),
    closedTransform: "translateY(100%)",
  },
};

/**
 * Generic sliding drawer. Fully controlled — mount as many as you like,
 * each with its own `open`/`onClose`/`side`/`size`/`zIndex`, to stack
 * multiple panels (e.g. a settings drawer over a filter drawer).
 *
 * <Drawer open={open} onClose={() => setOpen(false)} side="right" size={320}>
 *   ...content...
 * </Drawer>
 */
export default function Drawer({
  open,
  onClose,
  side = "right",
  size = 320,
  zIndex = 50,
  overlay = true,
  className = "",
  children,
}: { open: boolean; onClose?: () => void; side?: "right" | "left" | "top" | "bottom"; size?: number | string; zIndex?: number; overlay?: boolean; className?: string; children?: React.ReactNode }) {
  const cfg = SIDE_CONFIG[side];

  // Only in the DOM while open or mid-close-transition — this component is
  // mounted a couple dozen times on /pos at once, and a permanently-present
  // fixed, backdrop-blur'd overlay per instance (even at opacity:0) is a lot
  // of simultaneous GPU compositor layers, which is a known flicker trigger
  // on macOS. Unmounting when fully closed avoids that entirely.
  const [shouldRender, setShouldRender] = React.useState(open);
  React.useEffect(() => {
    if (open) {
      setShouldRender(true);
      return;
    }
    const timeoutId = setTimeout(() => setShouldRender(false), 300);
    return () => clearTimeout(timeoutId);
  }, [open]);

  if (!shouldRender || typeof document === "undefined") return null;

  // Portaled straight to <body> — this panel's own `transform` (set even
  // while open, to `translate(0,0)`) makes it a new containing block for any
  // `position: fixed` descendant. Nesting a Drawer inside another open
  // Drawer's content (e.g. a Filter drawer opened from a product list that's
  // itself inside a "Manage Cart Items" drawer) would otherwise anchor the
  // inner one to that transformed ancestor instead of the viewport, and get
  // silently clipped by whatever `overflow-hidden` wrapper sits in between.
  return createPortal(
    <>
      {overlay && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity duration-300 ease-in-out"
          style={{
            zIndex,
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
          }}
          onClick={onClose}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        className={`fixed bg-component-bg text-text border-border shadow-xl transition-transform duration-300 ease-in-out ${cfg.wrapper} ${className}`}
        style={{
          zIndex: zIndex + 1,
          ...cfg.size(size),
          transform: open ? "translate(0, 0)" : cfg.closedTransform,
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
