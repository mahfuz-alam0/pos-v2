"use client";

import { SessionProvider } from "./session-context";
import SessionConfigurationStep from "./SessionConfigurationStep";

export default function StartSessionWizard() {
  return (
    <SessionProvider>
      <SessionConfigurationStep mode="create" />
    </SessionProvider>
  );
}
