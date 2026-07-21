"use client";

const SIDE_CONFIG = {
  right: {
    wrapper: "top-0 right-0 h-full border-l",
    size: (px) => ({ width: px }),
    closedTransform: "translateX(100%)",
  },
  left: {
    wrapper: "top-0 left-0 h-full border-r",
    size: (px) => ({ width: px }),
    closedTransform: "translateX(-100%)",
  },
  top: {
    wrapper: "top-0 left-0 w-full border-b",
    size: (px) => ({ height: px }),
    closedTransform: "translateY(-100%)",
  },
  bottom: {
    wrapper: "bottom-0 left-0 w-full border-t",
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
}) {
  const cfg = SIDE_CONFIG[side];

  return (
    <>
      {overlay && (
        <div
          className="fixed inset-0 bg-black/30 transition-opacity duration-300 ease-in-out"
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
        className={`fixed max-w-[85vw] max-h-[85vh] bg-component-bg text-text border-border shadow-xl transition-transform duration-300 ease-in-out ${cfg.wrapper} ${className}`}
        style={{
          zIndex: zIndex + 1,
          ...cfg.size(size),
          transform: open ? "translate(0, 0)" : cfg.closedTransform,
        }}
      >
        {children}
      </div>
    </>
  );
}
