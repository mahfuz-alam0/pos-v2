"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Share-mode gate: prompts for a manager PIN and forwards it as `proxyPin` on
// the mutating call. The backend validates the PIN — this dialog is just the
// entry point, not the check (old app decrypted+compared client-side, which
// was security theater since the server re-validates anyway).
export default function ProxyPinDialog({ open, onClose, onSubmit, title = "Enter PIN to proceed" }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pin) return;
    setLoading(true);
    try {
      await onSubmit(pin);
      setPin("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter your manager PIN to authorize this action.</DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          autoFocus
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!pin || loading}>
            {loading ? "Verifying..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
