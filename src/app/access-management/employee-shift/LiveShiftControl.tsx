"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogIn, LogOut, X } from "lucide-react";

import { useCurrentUser } from "@/util/use-current-user";
import { startLiveShift } from "@/services/employees/shift/startLive";
import { endLiveShift } from "@/services/employees/shift/endLive";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/form-fields";

export default function LiveShiftControl({ liveShift, onChanged }: { liveShift: any; onChanged: () => void }) {
  const user = useCurrentUser();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isMyShiftActive = liveShift?.employeeId === user?.id;
  const action: "START_SHIFT" | "END_SHIFT" = isMyShiftActive ? "END_SHIFT" : "START_SHIFT";

  const handleSubmit = async () => {
    if (!pin.trim()) {
      toast.error("Please enter your PIN");
      return;
    }
    setSubmitting(true);
    try {
      if (action === "START_SHIFT") {
        await startLiveShift(pin);
        toast.success("Shift started");
      } else {
        await endLiveShift(pin);
        toast.success("Shift ended");
      }
      setPin("");
      setPinOpen(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update shift");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant={action === "END_SHIFT" ? "destructive" : "default"} onClick={() => setPinOpen(true)}>
        {action === "END_SHIFT" ? <LogOut className="size-4" /> : <LogIn className="size-4" />}
        {action === "END_SHIFT" ? "End Shift" : "Start Shift"}
      </Button>

      <Drawer open={pinOpen} onClose={submitting ? undefined : () => setPinOpen(false)} side="right" size={380}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
            <div className="text-base font-semibold">{action === "END_SHIFT" ? "End Shift" : "Start Shift"}</div>
            <Button variant="outline" size="icon-sm" onClick={() => setPinOpen(false)} disabled={submitting}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 px-5 py-4">
            <Field label="Enter your PIN" required>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
            <Button variant="outline" onClick={() => setPinOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
