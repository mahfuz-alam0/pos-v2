"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/signin"];

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return Boolean(localStorage.getItem("userInfo"));
}

function getServerSnapshot() {
  return false;
}

function useAuthed() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const authed = useAuthed();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const shouldRedirect = mounted && ((!authed && !isPublic) || (authed && isPublic));

  useEffect(() => {
    if (!mounted) return;

    if (!authed && !isPublic) {
      const next = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/signin${next}`);
      return;
    }

    if (authed && isPublic) {
      router.replace("/");
    }
  }, [mounted, authed, isPublic, pathname, router]);

  if (!mounted || shouldRedirect) return null;

  return children;
}
