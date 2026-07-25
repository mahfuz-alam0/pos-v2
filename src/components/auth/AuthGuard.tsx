"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AUTH_CHANGE_EVENT } from "@/util/use-auth";

export const PUBLIC_PATHS = ["/signin"];

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return Boolean(localStorage.getItem("userInfo"));
}

function getServerSnapshot() {
  return false;
}

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const authed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!checked) return;

    if (!authed && !isPublic) {
      const next = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/signin${next}`);
      return;
    }

    if (authed && isPublic) {
      const nextRaw = searchParams.get("next") || "/";
      const safeNext = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
      router.replace(safeNext);
    }
  }, [checked, authed, pathname, isPublic, router, searchParams]);

  const needsRedirect = checked && ((!authed && !isPublic) || (authed && isPublic));

  if (needsRedirect) return null;

  return children;
}
