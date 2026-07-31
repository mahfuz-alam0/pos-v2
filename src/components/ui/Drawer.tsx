"use client";

import * as React from "react";

// "100vw"/"100%" get their own wrapper branch (full-bleed via inset, no
// `width` style) — `width: 100vw` on a `fixed right-0` element overshoots
// the visual viewport by the scrollbar gutter on some browsers (notably iOS
// Safari), which is what caused the half-offscreen/transparent-looking
// drawer on some devices.
const FULL_SIZES = new Set(["100vw", "100%"]);

const SIDE_CONFIG = {
  right: {
    wrapper: "top-0 right-0 h-full max-w-[100vw]",
    fullWrapper: "top-0 right-0 left-0 h-full w-auto",
    size: (px) => ({ width: px }),
    closedTransform: "translateX(100%)",
  },
  left: {
    wrapper: "top-0 left-0 h-full max-w-[100vw]",
    fullWrapper: "top-0 left-0 right-0 h-full w-auto",
    size: (px) => ({ width: px }),
    closedTransform: "translateX(-100%)",
  },
  top: {
    wrapper: "top-0 left-0 w-full max-h-[85vh]",
    fullWrapper: "top-0 left-0 w-full h-auto max-h-none",
    size: (px) => ({ height: px }),
    closedTransform: "translateY(-100%)",
  },
  bottom: {
    wrapper: "bottom-0 left-0 w-full max-h-[85vh]",
    fullWrapper: "bottom-0 left-0 w-full h-auto max-h-none",
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
  const isFull = FULL_SIZES.has(size as string);

  // Only in the DOM while open or mid-close-transition — this component is
  // mounted a couple dozen times on /pos at once, and a permanently-present
  // fixed, backdrop-blur'd overlay per instance (even at opacity:0) is a lot
  // of simultaneous GPU compositor layers, which is a known flicker trigger
  // on macOS. Unmounting when fully closed avoids that entirely.
  const [shouldRender, setShouldRender] = React.useState(open);
  // On open, the panel must not mount already at translate(0,0) — with no
  // prior "closed" paint, the browser has nothing to transition from and it
  // just pops in instead of sliding. `entered` starts false so the first
  // frame renders the closed transform, then flips true a frame later so
  // the transition has a real start point.
  const [entered, setEntered] = React.useState(false);
  const rafId2Ref = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (open) {
      setShouldRender(true);
      // A single rAF can still land in the same paint as the mount (the
      // closed-transform frame never actually reaches the screen), which
      // skips the transition and makes the drawer pop open instead of
      // sliding. Nesting a second rAF guarantees one full painted frame at
      // the closed transform before flipping to entered.
      const rafId1 = requestAnimationFrame(() => {
        const rafId2 = requestAnimationFrame(() => setEntered(true));
        rafId2Ref.current = rafId2;
      });
      return () => {
        cancelAnimationFrame(rafId1);
        if (rafId2Ref.current) cancelAnimationFrame(rafId2Ref.current);
      };
    }
    setEntered(false);
    const timeoutId = setTimeout(() => setShouldRender(false), 500);
    return () => clearTimeout(timeoutId);
  }, [open]);

  if (!shouldRender) return null;

  return (
    <>
      {overlay && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity duration-500 ease-in-out"
          style={{
            zIndex,
            opacity: entered ? 1 : 0,
            pointerEvents: entered ? "auto" : "none",
          }}
          onClick={onClose}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        className={`fixed bg-component-bg text-text border-border shadow-xl transition-transform duration-500 ease-in-out ${isFull ? cfg.fullWrapper : cfg.wrapper} ${className}`}
        style={{
          zIndex: zIndex + 1,
          ...(isFull ? {} : cfg.size(size)),
          transform: entered ? "translate(0, 0)" : cfg.closedTransform,
        }}
      >
        {children}
      </div>
    </>
  );
}
