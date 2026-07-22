"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/signin"];

function isAuthed() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("userInfo"));
}

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const authed = isAuthed();
  const needsRedirect = (!authed && !isPublic) || (authed && isPublic);

  useEffect(() => {
    if (!authed && !isPublic) {
      const next = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/signin${next}`);
      return;
    }

    if (authed && isPublic) {
      router.replace("/");
    }
  }, [authed, pathname, isPublic, router]);

  if (needsRedirect) return null;

  return children;
}
