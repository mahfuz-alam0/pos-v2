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
    setUser(getCurrentUser());
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
