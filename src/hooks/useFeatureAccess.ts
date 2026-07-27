"use client";

import { useEffect, useState } from "react";

const METRC_MECHANISMS = ["METRC_OK", "METRC_CALI", "METRC_MI"];

function readUserInfo() {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
}

export function useFeatureAccess(): string | null {
  const [mechanism, setMechanism] = useState<string | null>(null);

  useEffect(() => {
    const scopes: string[] = readUserInfo()?.orgFeatureScopes || [];
    const found = scopes.find((scope) => METRC_MECHANISMS.some((m) => scope.toUpperCase().includes(m)));
    setMechanism(found ?? null);
  }, []);

  return mechanism;
}
