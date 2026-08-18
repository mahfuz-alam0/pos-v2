"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPES } from "@/hooks/usePrintClients";
import { createHardwareClient } from "@/services/hardwareClients/create";
import { updateHardwareClient } from "@/services/hardwareClients/update";

// Stacks above PrinterSetupDrawer (zIndex 55) and below the AlertDialog
// default (z-60) used for delete confirmation in LocalDeviceManager.
const DRAWER_Z_INDEX = 58;

const JOB_TYPE_OPTIONS = Object.values(JOB_TYPES).map((jt) => ({ value: jt, label: jt.replace(/_/g, " ") }));

export default function LocalDeviceFormDrawer({ open, editing, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [jobType, setJobType] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setJobType(editing?.jobType ?? "");
  }, [open, editing]);

  async function handleSave() {
    if (!name.trim() || !jobType) {
      toast.warning("Name and job type are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateHardwareClient(editing._id, { name: name.trim(), jobType });
        toast.success("Device updated");
      } else {
        await createHardwareClient({ name: name.trim(), jobType });
        toast.success("Device added");
      }
      onSaved();
    } catch (err) {
      toast.error(err?.message || `Failed to ${editing ? "update" : "add"} device`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" size={420} zIndex={DRAWER_Z_INDEX} className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-heading">{editing ? "Edit Local Device" : "Add Local Device"}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-sidebar-text hover:text-text">
          ✕
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="local-device-name">Name</Label>
          <Input
            id="local-device-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Front Counter Receipt Printer"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Job Type</Label>
          {/* value is always a defined string (never undefined) so the Select
              stays controlled from its first render — passing `undefined`
              on an empty selection makes Base UI treat it as uncontrolled,
              then flip to controlled on the first real pick, which logs a
              dev warning. */}
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPE_OPTIONS.map((job) => (
                <SelectItem key={job.value} value={job.value}>
                  {job.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border p-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Device"}
        </Button>
      </div>
    </Drawer>
  );
}
