"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CloudUpload, Loader2, RefreshCw } from "lucide-react";
import Drawer from "@/components/ui/Drawer";

function dataUrlToFile(dataUrl: string, prefix: string) {
  const [meta, base64] = dataUrl.split(",");
  const contentType = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], `${prefix}-${Date.now()}.${contentType.split("/")[1]}`, {
    type: contentType,
  });
}

/**
 * Dedicated "Upload Medical License ID" drawer — ported from the old Add
 * Customer scan flow (Add Customer/ocr.js's UploadLicenseForm): Upload/
 * Camera toggle, a big live preview with front/back camera switching, and a
 * loading state while the image uploads + runs through medical-ID OCR.
 * Unlike the legacy quick-add-customer flow this doesn't do a duplicate-
 * customer search or offer "Add to Queue"/"Place Order" — it's opened from
 * inside an already-open Add/Edit Customer form, so onFile just uploads,
 * OCRs, and autofills the open form's fields (same as the other identity
 * doc cards), then the drawer closes.
 *
 * Props:
 *   open, onClose — drawer visibility.
 *   onFile        — receives the picked/captured File; do the upload+OCR.
 *   previewUrl    — the currently-saved medical ID image, if any.
 */
export default function MedIdScanDrawer({
  open,
  onClose,
  onFile,
  previewUrl,
  zIndex = 60,
}: {
  open: boolean;
  onClose: () => void;
  onFile: (file: File) => Promise<void> | void;
  previewUrl?: string | null;
  zIndex?: number;
}) {
  const [mode, setMode] = useState<"device" | "camera">("device");
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  // Reset to a clean state every time the drawer opens.
  useEffect(() => {
    if (open) {
      setMode("device");
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "camera" || busy) return;
    let cancelled = false;
    (async () => {
      try {
        setCameraError(null);
        stopCamera();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
        setCameraReady(true);
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError(
          "Unable to access camera. Check permissions and try again.",
        );
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, busy, facingMode]);

  useEffect(() => stopCamera, []);

  const runFile = async (file: File) => {
    setBusy(true);
    try {
      await onFile(file);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process image");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    runFile(dataUrlToFile(dataUrl, "medid"));
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={480} zIndex={zIndex}>
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-4 text-base font-semibold">
          Upload Medical License ID
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-5 flex gap-0.5 rounded-lg bg-muted p-0.5 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("device")}
              className={`flex-1 rounded-[7px] py-1.5 transition-colors ${
                mode === "device"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-background/60"
              }`}>
              Upload
            </button>
            <button
              type="button"
              onClick={() => setMode("camera")}
              className={`flex-1 rounded-[7px] py-1.5 transition-colors ${
                mode === "camera"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-background/60"
              }`}>
              Camera
            </button>
          </div>

          {busy ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl bg-muted/40">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Processing medical ID…
              </span>
            </div>
          ) : mode === "device" ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 text-center transition-colors hover:bg-muted/70">
              <span className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-foreground/10">
                <CloudUpload className="size-5" />
              </span>
              <span className="text-sm font-medium">Click to Upload</span>
              <span className="px-6 text-xs text-muted-foreground">
                Medical ID — auto-fills form fields
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cameraError ? (
                <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                  {cameraError}
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-64 w-full object-cover"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((m) =>
                      m === "user" ? "environment" : "user",
                    )
                  }
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 hover:bg-muted">
                  <RefreshCw className="size-3.5" />
                  Switch Camera ({facingMode === "user" ? "Front" : "Back"})
                </button>
                <button
                  type="button"
                  disabled={!cameraReady}
                  onClick={capturePhoto}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
                  <Camera className="size-3.5" />
                  Capture Image
                </button>
              </div>
            </div>
          )}

          {previewUrl && (
            <div className="mt-5">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                Current image
              </div>
              <img
                src={previewUrl}
                alt="Medical ID"
                className="h-28 w-full rounded-lg object-cover ring-1 ring-foreground/10"
              />
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) runFile(file);
        }}
      />
    </Drawer>
  );
}
