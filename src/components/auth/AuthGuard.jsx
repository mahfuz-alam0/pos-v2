"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/signin"];

function isAuthed() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("userInfo"));
}

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const authed = isAuthed();

    if (!authed && !isPublic) {
      const next = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/signin${next}`);
      return;
    }

    if (authed && isPublic) {
      router.replace("/");
      return;
    }

    setReady(true);
  }, [pathname, isPublic, router]);

  if (!ready) return null;

  return children;
}
