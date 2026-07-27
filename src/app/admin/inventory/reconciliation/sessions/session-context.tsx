"use client";

import { createContext, useContext, useState } from "react";

interface SessionData {
  location: any;
  budtenders: any[];
  duration: number | null;
  blindCount: boolean;
  criteria: any[];
  selectedProducts: any[];
}

interface SessionContextValue {
  sessionData: SessionData;
  setSessionData: React.Dispatch<React.SetStateAction<SessionData>>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionData, setSessionData] = useState<SessionData>({
    location: null,
    budtenders: [],
    duration: null,
    blindCount: false,
    criteria: [],
    selectedProducts: [],
  });

  return (
    <SessionContext.Provider value={{ sessionData, setSessionData }}>{children}</SessionContext.Provider>
  );
}
