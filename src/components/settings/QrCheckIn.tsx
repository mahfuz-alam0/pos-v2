"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addCustomerToQueueByQrToken } from "@/services/customerQueue/add";

// Scanner hardware sends the payload as keystrokes and terminates with Enter;
// the idle timeout is only a fallback for scanners configured without a suffix key.
const IDLE_FALLBACK_MS = 300;

export default function QrCheckIn({ open, onOpenChange, shopId, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const inputRef = useRef(null);
  const lastTokenRef = useRef(null);
  const idleTimeoutRef = useRef(null);

  const handleClose = () => {
    onOpenChange(false);
    setProcessing(false);
    setErrorText(null);
    lastTokenRef.current = null;
    clearTimeout(idleTimeoutRef.current);
  };

  useEffect(() => {
    const keepFocus = () => {
      if (open && inputRef.current) inputRef.current.focus();
    };
    document.addEventListener("click", keepFocus);
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    return () => document.removeEventListener("click", keepFocus);
  }, [open]);

  const handleScan = async (rawToken) => {
    const token = rawToken.trim();
    if (!token || processing || token === lastTokenRef.current) return;

    lastTokenRef.current = token;
    setProcessing(true);
    setErrorText(null);

    try {
      await addCustomerToQueueByQrToken({ shopId, token });
      toast.success("Customer checked in via QR code");
      onSuccess?.();
      handleClose();
    } catch (error) {
      setErrorText(error?.message || "This QR code is invalid or has expired");
      setProcessing(false);
      lastTokenRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleChange = (e) => {
    const next = e.target.value;
    clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => handleScan(next), IDLE_FALLBACK_MS);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(idleTimeoutRef.current);
      handleScan(e.target.value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Customer QR Code to Check In</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div>
            <h3 className="text-base font-semibold text-text">Waiting for QR scan...</h3>
            <p className="text-sm text-muted-foreground">Point the scanner at the customer's app QR code</p>
          </div>

          {processing && <div className="text-sm text-muted-foreground">Checking in…</div>}

          {errorText && (
            <div className="w-full rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorText}
            </div>
          )}

          <input
            ref={inputRef}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
            className="absolute -left-[9999px] -top-[9999px] h-0 w-0 opacity-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
