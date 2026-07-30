"use client";

import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT } from "@/util/use-auth";

export interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
  type: "SUPER_ADMIN" | "ADMINISTRATION" | "ACCESS_CONTROLLED";
  allowedPermissionCodes?: string[];
}

function readUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setUser(readUser());
    const handler = () => setUser(readUser());
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return user;
}
