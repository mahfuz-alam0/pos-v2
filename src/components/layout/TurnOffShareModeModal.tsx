"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TurnOffShareModeModal({ open, error, submitting, onSubmit, onClose }) {
  const [password, setPassword] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit() {
    if (!password || submitting) return;
    onSubmit(password);
  }

  return (
    <div className="fixed inset-0 z-1050 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-100 rounded-2xl border border-primary/20 bg-accent p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">End Share Mode session</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-sidebar-text">
          Enter your password to confirm turning off Share Mode.
        </p>

        <Input
          ref={inputRef}
          type="password"
          autoComplete="new-password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="mb-4 h-11"
        />

        {error && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!password || submitting}>
            {submitting ? "Confirming…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
