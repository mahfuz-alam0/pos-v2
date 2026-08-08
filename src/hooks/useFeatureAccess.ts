"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/util/use-current-user";

const METRC_MECHANISMS = ["METRC_OK", "METRC_CALI", "METRC_MI"];

export function useFeatureAccess(): string | null {
  const [mechanism, setMechanism] = useState<string | null>(null);
  const currentUser = useCurrentUser();

  useEffect(() => {
    const scopes: string[] = currentUser?.orgFeatureScopes || [];
    const found = scopes.find((scope) => METRC_MECHANISMS.some((m) => scope.toUpperCase().includes(m)));
    setMechanism(found ?? null);
  }, [currentUser]);

  return mechanism;
}
