"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QRCode } from "react-qrcode-logo";
import { Loader2 } from "lucide-react";

import { getQrSession } from "@/services/profile/getQrSession";
import { generateQrSession } from "@/services/profile/generateQrSession";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/admin/form-fields";

export default function QrCodeTab() {
  const [qrSession, setQrSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSession = async () => {
    try {
      setQrSession(await getQrSession());
    } catch {
      setQrSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleGenerate = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    setSubmitting(true);
    try {
      await generateQrSession({ password });
      await fetchSession();
      setDialogOpen(false);
      setPassword("");
      toast.success("QR code generated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#profile-qr-session canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "qr-session.png";
    link.click();
  };

  return (
    <div className="flex max-w-md flex-col gap-4">
      {loading ? (
        <Skeleton className="size-64" />
      ) : qrSession ? (
        <div id="profile-qr-session" className="w-fit rounded-lg bg-white p-3">
          <QRCode value={qrSession} size={256} bgColor="#FFFFFF" fgColor="#000000" qrStyle="dots" eyeRadius={8} />
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">
          No QR session yet. Generate one to sign in by scanning.
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setDialogOpen(true)}>{qrSession ? "Generate New QR Code" : "Generate QR Code"}</Button>
        {qrSession && (
          <Button variant="outline" onClick={handleDownload}>
            Download
          </Button>
        )}
      </div>

      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        Scan this code at the sign-in screen to log in without typing your credentials. Generating a new code
        invalidates the previous one.
      </p>

      <Dialog open={dialogOpen} onOpenChange={(next) => !next && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate QR Code</DialogTitle>
          </DialogHeader>

          <Field label="Current Password" required>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
