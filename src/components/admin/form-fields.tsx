"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ChevronDown, FileText, Loader2, Upload, X } from "lucide-react";

import { uploadAnySingleFile } from "@/services/storage/uploadFile";
import { fetchShopsData } from "@/services/shops/list";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 flex items-center gap-1 text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

export function SingleImageUpload({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("You can only upload image files!");
      return;
    }
    if (file.size / 1024 / 1024 >= 5) {
      toast.error("Image must be smaller than 5MB!");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadAnySingleFile(file);
      const url = res?.downloadUrl || res?.url;
      if (url) onChange(url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  if (imageUrl) {
    return (
      <div className="group relative h-40 w-full overflow-hidden rounded-lg ring-1 ring-foreground/10">
        <img src={imageUrl} alt="" className="size-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {uploading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
        </>
      )}
    </div>
  );
}

// Thumbnail for an uploaded document link — shows the image if it loads,
// falls back to a generic file icon for PDFs/other non-image uploads (the
// upload input accepts any file type).
function DocThumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-20 w-full items-center justify-center bg-muted">
        <FileText className="size-6 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="h-20 w-full object-cover"
    />
  );
}

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

export function DocumentsUpload({
  links,
  onChange,
  variant = "dropzone",
}: {
  links: string[];
  onChange: (links: string[]) => void;
  variant?: "dropzone" | "button";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (!cameraOpen) return;
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
  }, [cameraOpen]);

  useEffect(() => stopCamera, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadAnySingleFile(file);
      const url = res?.downloadUrl || res?.url;
      if (url) onChange([...links, url]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const res = await uploadAnySingleFile(file);
          return res?.downloadUrl || res?.url;
        }),
      );
      onChange([...links, ...uploaded.filter(Boolean)]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload document");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCameraOpen(false);
    await uploadFile(dataUrlToFile(dataUrl, "document"));
  };

  return (
    <div className="flex flex-col gap-3">
      {links.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {links.map((link, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
            >
              <a href={link} target="_blank" rel="noreferrer" className="block">
                <DocThumb src={link} />
              </a>
              <div className="flex items-center justify-between gap-1 px-2.5 py-1.5">
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-xs font-medium text-primary hover:underline"
                >
                  Document {i + 1}
                </a>
                <button
                  type="button"
                  onClick={() => onChange(links.filter((_, idx) => idx !== i))}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl bg-muted/40 text-center transition-colors hover:bg-muted/70"
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <span className="flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-foreground/10">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {uploading ? "Uploading…" : "Upload documents"}
          </span>
        </div>

        {cameraOpen ? (
          <div className="col-span-2 flex flex-col gap-2 rounded-xl bg-muted/40 p-2.5 ring-1 ring-foreground/10">
            {cameraError ? (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{cameraError}</div>
            ) : (
              <div className="overflow-hidden rounded-lg bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="h-40 w-full object-cover" />
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="flex-1 rounded-lg py-1.5 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!cameraReady || uploading}
                onClick={capturePhoto}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                Capture
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !uploading && setCameraOpen(true)}
            className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl bg-muted/40 text-center transition-colors hover:bg-muted/70"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-foreground/10">
              <Camera className="size-4" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Take Photo with Camera</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface Shop {
  id: string | number;
  name: string;
}

export function ShopMultiSelect({
  value,
  onChange,
}: {
  value: (string | number)[];
  onChange: (ids: (string | number)[]) => void;
}) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchShopsData().then((res) => setShops(res?.data ?? []));
  }, []);

  const toggle = (id: string | number) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const selectedNames = shops.filter((s) => value.includes(s.id)).map((s) => s.name);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm outline-none dark:bg-input/30"
        )}
      >
        <span className={cn("truncate text-left", selectedNames.length === 0 && "text-muted-foreground")}>
          {selectedNames.length > 0 ? selectedNames.join(", ") : "Select Shops"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5" align="start">
        <div className="max-h-56 overflow-y-auto">
          {shops.length === 0 && <div className="py-3 text-center text-sm text-muted-foreground">No shops</div>}
          {shops.map((shop) => (
            <label
              key={shop.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox checked={value.includes(shop.id)} onCheckedChange={() => toggle(shop.id)} />
              <span className="truncate">{shop.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
