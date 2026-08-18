"use client";

import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT } from "@/util/use-auth";

export interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
  type: "SUPER_ADMIN" | "ADMINISTRATION" | "ACCESS_CONTROLLED";
  allowedPermissionCodes?: string[];
  orgFeatureScopes?: string[];
  orgId?: string;
  sessionId?: string;
  associatedShopIds?: string[];
  avatarUrl?: string;
}

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
}

export function useCurrentUser() {
  // Initialize synchronously from localStorage so permission-gated sections
  // render on first paint instead of mounting a frame later (CLS). The
  // effect keeps the value in sync with auth changes afterward.
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());

  useEffect(() => {
    // No immediate setUser() here — the useState initializer above already
    // read localStorage synchronously for the first render. Re-reading and
    // re-setting on mount would hand out a fresh (but `JSON.parse`-distinct)
    // object reference for identical data, which downstream effects keyed on
    // this value (by reference, e.g. Topbar's chat-init effect) would see as
    // a genuine change and re-run for no reason.
    const handler = () => setUser(getCurrentUser());
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return user;
}
