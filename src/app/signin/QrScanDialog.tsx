"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { decodeQrFromVideoFrame, preloadQrReader } from "@/lib/qrScan";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface QrScanDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export default function QrScanDialog({ open, onClose, onScan }: QrScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState("");

  function stopCamera() {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) return;
    preloadQrReader();
    let cancelled = false;

    (async () => {
      try {
        setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        scanningRef.current = true;
        const loop = async () => {
          if (cancelled || !scanningRef.current) return;
          const text = await decodeQrFromVideoFrame(videoRef.current).catch(() => null);
          if (cancelled || !scanningRef.current) return;
          if (text) {
            stopCamera();
            onScan(text);
            return;
          }
          requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setCameraError("Unable to access camera. Check permissions and try again.");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>Point your camera at the login QR code.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center text-sm text-white">
              {cameraError}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
        >
          <RefreshCw className="h-4 w-4" />
          Switch to {facingMode === "environment" ? "Front" : "Back"} Camera
        </Button>
      </DialogContent>
    </Dialog>
  );
}
