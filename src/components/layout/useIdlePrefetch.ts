"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface MenuItem {
  href?: string;
  children?: MenuItem[];
}

function collectHrefs(items: MenuItem[], out: string[] = []) {
  for (const item of items) {
    if (item.href) out.push(item.href);
    if (item.children?.length) collectHrefs(item.children, out);
  }
  return out;
}

const requestIdle: (cb: () => void) => number =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 2000 })
    : (cb) => window.setTimeout(cb, 300);

const cancelIdle: (id: number) => void =
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? (id) => (window as any).cancelIdleCallback(id)
    : (id) => window.clearTimeout(id);

/**
 * Trickle-prefetches every route in the sidebar tree, one at a time, only
 * during browser idle time — so first paint and any active navigation never
 * compete with it for bandwidth. Skips the current route and dedupes.
 */
export function useIdlePrefetch(items: MenuItem[]) {
  const router = useRouter();
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    const hrefs = Array.from(new Set(collectHrefs(items)));
    let cancelled = false;
    let i = 0;

    const step = () => {
      if (cancelled) return;
      if (i >= hrefs.length) return;

      const href = hrefs[i++];
      try {
        router.prefetch(href);
      } catch {
        // ignore individual prefetch failures, keep trickling
      }

      idRef.current = requestIdle(step);
    };

    idRef.current = requestIdle(step);

    return () => {
      cancelled = true;
      if (idRef.current != null) cancelIdle(idRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
