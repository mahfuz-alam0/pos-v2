"use client";

import { useEffect, useState } from "react";
import { createShareMode } from "@/services/auth/createShareMode";
import { turnOffShareMode } from "@/services/auth/turnOffShareMode";

export const SHARE_MODE_EVENT = "shareModeUpdated";

export function useShareMode() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(localStorage.getItem("shareMode") === "true");
    const handleUpdate = () => setActive(localStorage.getItem("shareMode") === "true");
    window.addEventListener(SHARE_MODE_EVENT, handleUpdate);
    return () => window.removeEventListener(SHARE_MODE_EVENT, handleUpdate);
  }, []);

  async function turnOn(pin) {
    const res = await createShareMode(pin);
    if (res?.data?.success) {
      localStorage.setItem("shareMode", "true");
      window.dispatchEvent(new Event(SHARE_MODE_EVENT));
      return { success: true };
    }
    return { success: false, message: "Failed to turn on Share Mode." };
  }

  async function turnOff(password) {
    const res = await turnOffShareMode(password);
    if (res?.data?.success) {
      localStorage.removeItem("shareMode");
      localStorage.removeItem("preferredUserIds");
      window.dispatchEvent(new Event(SHARE_MODE_EVENT));
      return { success: true };
    }
    return { success: false, message: "Failed to turn off Share Mode." };
  }

  return { active, turnOn, turnOff };
}
