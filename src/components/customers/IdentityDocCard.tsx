"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CloudUpload, Loader2 } from "lucide-react";

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
 * Inline "upload from device or camera" card — the legacy Add Customer
 * identity-documents layout (radio toggle + dashed drop zone) ported as an
 * always-visible card instead of a button that opens a drawer. Processing
 * (upload, OCR, barcode decode, ...) is fully delegated to onFile so this
 * stays reusable across avatar / front DL / back DL / med ID.
 */
export default function IdentityDocCard({
  title,
  description,
  uploadHint,
  previewUrl,
  onFile,
}: {
  title: string;
  description: string;
  uploadHint: string;
  previewUrl?: string | null;
  onFile: (file: File, dataUrl: string) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"device" | "camera">("device");
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (mode !== "camera" || busy) return;
    let cancelled = false;
    (async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
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
        setCameraError("Unable to access camera. Check permissions and try again.");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, busy]);

  useEffect(() => stopCamera, []);

  const runFile = async (file: File, dataUrl: string) => {
    setBusy(true);
    try {
      await onFile(file, dataUrl);
    } catch (err: any) {
      toast.error(err?.message || "Failed to process image");
    } finally {
      setBusy(false);
    }
  };

  const handlePicked = (file: File | undefined) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => runFile(file, fr.result as string);
    fr.readAsDataURL(file);
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
    runFile(dataUrlToFile(dataUrl, "doc"), dataUrl);
  };

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl bg-background p-3.5 shadow-sm ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <p className="mt-0.5 min-h-8 text-xs text-muted-foreground">{description}</p>
        </div>
        {previewUrl && !busy && (
          <span className="mt-0.5 size-2 shrink-0 rounded-full bg-green-500" title="Uploaded" />
        )}
      </div>

      <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("device")}
          className={`flex-1 rounded-[7px] py-1.5 transition-colors ${
            mode === "device" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          }`}>
          Upload
        </button>
        <button
          type="button"
          onClick={() => setMode("camera")}
          className={`flex-1 rounded-[7px] py-1.5 transition-colors ${
            mode === "camera" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          }`}>
          Camera
        </button>
      </div>

      {busy ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Processing…</span>
        </div>
      ) : previewUrl ? (
        <div className="group relative flex-1 overflow-hidden rounded-lg ring-1 ring-foreground/10">
          <img src={previewUrl} alt={title} className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={() => (mode === "device" ? fileInputRef.current?.click() : setMode("camera"))}
            className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent opacity-0 transition-all group-hover:bg-black/50 group-hover:text-white group-hover:opacity-100">
            <span className="text-xs font-semibold">Replace</span>
          </button>
        </div>
      ) : mode === "device" ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg bg-muted/40 py-8 text-center transition-colors hover:bg-muted/70">
          <span className="flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-foreground/10">
            <CloudUpload className="size-4" />
          </span>
          <span className="text-sm font-medium">Click to Upload</span>
          <span className="px-4 text-xs text-muted-foreground">{uploadHint}</span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2">
          {cameraError ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{cameraError}</div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="h-32 w-full object-cover" />
            </div>
          )}
          <button
            type="button"
            disabled={!cameraReady}
            onClick={capturePhoto}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40">
            <Camera className="size-3.5" /> Capture
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePicked(e.target.files?.[0])}
      />
    </div>
  );
}
