import { useState } from "react";
import { isShareMode } from "./constants";

// Wraps a proxyPin-accepting async action. In share mode, prompts for a PIN
// first (remembering the call args); otherwise calls straight through with
// proxyPin: null.
export function usePinGatedAction(action) {
  const [pendingArgs, setPendingArgs] = useState(null);

  const run = async (...args) => {
    if (isShareMode()) {
      setPendingArgs(args);
      return;
    }
    await action(null, ...args);
  };

  const submitPin = async (pin) => {
    const args = pendingArgs || [];
    setPendingArgs(null);
    await action(pin, ...args);
  };

  return { run, pinDialogOpen: pendingArgs !== null, closePinDialog: () => setPendingArgs(null), submitPin };
}
