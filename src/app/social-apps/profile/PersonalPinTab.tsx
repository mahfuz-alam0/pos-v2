"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";

import { getMyPin } from "@/services/profile/getMyPin";
import { generatePin } from "@/services/profile/generatePin";
import { setPin as setPinRequest } from "@/services/profile/setPin";
import { decryptPin } from "@/util/pin";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/admin/form-fields";

export default function PersonalPinTab() {
  const [encryptedPin, setEncryptedPin] = useState("");
  const [decryptedPin, setDecryptedPin] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasPin = Boolean(encryptedPin);

  const fetchPin = async () => {
    try {
      const res = await getMyPin();
      const encrypted = res?.data?.data?.pin || "";
      setEncryptedPin(encrypted);
      setDecryptedPin(decryptPin(encrypted));
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch the PIN");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPin();
  }, []);

  const closeDialog = () => {
    setDialogOpen(false);
    setPassword("");
    setNewPin("");
  };

  const handleSubmit = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    if (hasPin && !/^\d{4,8}$/.test(newPin)) {
      toast.error("PIN must be 4 to 8 digits (numbers only)");
      return;
    }

    setSubmitting(true);
    try {
      if (hasPin) await setPinRequest({ password, newPin });
      else await generatePin({ password });
      await fetchPin();
      closeDialog();
      toast.success(hasPin ? "PIN updated successfully" : "PIN generated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!decryptedPin) return;
    navigator.clipboard
      .writeText(decryptedPin)
      .then(() => toast.success("PIN copied to clipboard"))
      .catch(() => toast.error("Failed to copy PIN"));
  };

  return (
    <div className="flex max-w-md flex-col gap-4">
      <Field label="Your PIN">
        <div className="flex gap-2">
          <Input
            readOnly
            type={visible ? "text" : "password"}
            value={loading ? "" : visible ? decryptedPin : encryptedPin}
            placeholder={loading ? "Loading…" : hasPin ? "" : "No PIN set yet"}
          />
          <Button variant="outline" size="icon" onClick={() => setVisible((v) => !v)} disabled={!decryptedPin}>
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopy} disabled={!decryptedPin}>
            <Copy className="size-4" />
          </Button>
        </div>
      </Field>

      <div>
        <Button onClick={() => setDialogOpen(true)} disabled={loading}>
          {hasPin ? "Change PIN" : "Generate PIN"}
        </Button>
      </div>

      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        Your PIN authorizes register actions such as clocking in and turning share mode on. Use your account password to
        generate or change it.
      </p>

      <Dialog open={dialogOpen} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hasPin ? "Change PIN" : "Generate PIN"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field label="Current Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Field>

            {hasPin && (
              <Field label="New PIN" required>
                <Input
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 4-8 digit PIN"
                />
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {hasPin ? "Change PIN" : "Generate PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
