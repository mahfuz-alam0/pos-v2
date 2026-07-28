"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import {
  Inbox, Image as ImageIcon, Clock, Trash2, CheckCircle2, ZoomIn, RotateCw, Video as VideoIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { GroupCard, GroupLabel } from "./SharedFields";

export interface PendingUpload {
  id: string;
  file: File;
  previewUrl: string;
}

type PendingUploads = Record<string, PendingUpload[]>;

// ─── Canvas crop helper ─────────────────────────────────────────────────────
function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }, rotation = 0): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      const maxSize = Math.max(image.width, image.height);
      const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

      canvas.width = safeArea;
      canvas.height = safeArea;

      ctx.translate(safeArea / 2, safeArea / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-safeArea / 2, -safeArea / 2);

      ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2);

      const data = ctx.getImageData(0, 0, safeArea, safeArea);

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
      );

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas is empty"));
        resolve(blob);
      }, "image/jpeg", 0.95);
    });
    image.addEventListener("error", reject);
    image.src = imageSrc;
  });
}

const MODAL_CONTENT_WIDTH = 552;

const getCropContainerHeight = (aspect: number | null) => {
  if (!aspect) return 360;
  const h = Math.round(MODAL_CONTENT_WIDTH / aspect);
  return Math.min(480, Math.max(200, h));
};

function CropModal({
  open, imageSrc, aspect, onCancel, onConfirm,
}: {
  open: boolean;
  imageSrc: string | null;
  aspect: number | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);

  const containerHeight = getCropContainerHeight(aspect);

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setConfirming(true);
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob);
    } catch {
      toast.error("Failed to crop image.");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="relative w-full bg-neutral-900" style={{ height: containerHeight }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect ?? undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              showGrid
            />
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-primary" />
            <span className="w-12 shrink-0 text-sm">Zoom</span>
            <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v: number[]) => setZoom(v[0])} className="flex-1" />
          </div>
          <div className="flex items-center gap-3">
            <RotateCw className="size-4 shrink-0 text-primary" />
            <span className="w-12 shrink-0 text-sm">Rotate</span>
            <Slider min={-180} max={180} step={1} value={[rotation]} onValueChange={(v: number[]) => setRotation(v[0])} className="flex-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={confirming}>{confirming ? "Cropping..." : "Crop & Use"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared helpers ─────────────────────────────────────────────────────────
function validateImage(file: File): boolean {
  if (!file.type?.startsWith("image/")) {
    toast.error("Only image files are allowed.");
    return false;
  }
  if (file.size / 1024 / 1024 >= 25) {
    toast.error("Image must be smaller than 25MB.");
    return false;
  }
  return true;
}

function Dropzone({
  onFiles, accept, multiple = false, disabled, children, className = "",
}: {
  onFiles: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        onFiles(Array.from(e.dataTransfer.files || []));
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/30"
      } ${disabled ? "pointer-events-none opacity-50" : ""} ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files || []));
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      {children}
    </div>
  );
}

const DraggerContent = ({ isBgPattern, requiredRatioLabel }: { isBgPattern?: boolean; requiredRatioLabel?: string }) => (
  <>
    {isBgPattern ? <ImageIcon className="size-9 text-primary" /> : <Inbox className="size-9 text-muted-foreground" />}
    <p className="text-sm font-medium">{isBgPattern ? "Drop a pattern image here" : "Drag & drop images here"}</p>
    <p className="text-xs text-muted-foreground">
      {isBgPattern
        ? "Or click to choose a file. JPG, PNG, WebP or GIF up to 25MB. Uploads when you save the page."
        : `Or click to browse. Files upload on Save.${requiredRatioLabel ? ` Required ratio: ${requiredRatioLabel}.` : ""}`}
    </p>
  </>
);

function PendingTile({ item, onRemove }: { item: PendingUpload; onRemove: () => void }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-dashed border-primary/40 bg-primary/5">
      <div className="relative w-full pt-[56.25%]">
        <img src={item.previewUrl} alt="Pending" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="flex min-h-10 items-center justify-between px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Clock className="size-3.5" /> Pending
        </span>
        <Button size="sm" variant="ghost" className="h-auto p-0 font-semibold text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="size-3.5" /> Remove
        </Button>
      </div>
    </div>
  );
}

function SavedTile({ url, isVideo = false, onRemove }: { url: string; isVideo?: boolean; onRemove: () => void }) {
  return (
    <div className="overflow-hidden rounded-[10px] bg-background ring-1 ring-foreground/10">
      <div className="relative w-full pt-[56.25%] bg-muted/40">
        {isVideo ? (
          <video src={url} className="absolute inset-0 size-full object-cover" controls muted playsInline />
        ) : (
          <img src={url} alt="Saved" className="absolute inset-0 size-full object-cover" />
        )}
      </div>
      <div className="flex min-h-10 items-center justify-between px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" /> Saved
        </span>
        <Button size="sm" variant="ghost" className="h-auto p-0 font-semibold text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="size-3.5" /> Remove
        </Button>
      </div>
    </div>
  );
}

// ─── SingleImageUpload ──────────────────────────────────────────────────────
export function SingleImageUpload({
  label, uploadKey, value, saving,
  onQueue, onRemovePending, onRemoveSaved, pendingUploads = {},
  variant = "default",
  requiredRatio = null,
  requiredRatioLabel = "",
}: {
  label: string;
  uploadKey: string;
  value?: string | null;
  saving?: boolean;
  onQueue: (key: string, file: File, single: boolean) => void;
  onRemovePending: (key: string, id: string) => void;
  onRemoveSaved: () => void;
  pendingUploads?: PendingUploads;
  variant?: "default" | "backgroundPattern";
  requiredRatio?: number | null;
  requiredRatioLabel?: string;
}) {
  const pending = pendingUploads[uploadKey] || [];
  const isBgPattern = variant === "backgroundPattern";
  const [cropState, setCropState] = useState<{ open: boolean; src: string | null; originalFile: File | null }>({ open: false, src: null, originalFile: null });

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file || !validateImage(file)) return;

    if (requiredRatio) {
      const reader = new FileReader();
      reader.onload = (e) => setCropState({ open: true, src: e.target?.result as string, originalFile: file });
      reader.readAsDataURL(file);
    } else {
      onQueue(uploadKey, file, true);
    }
  };

  const handleCropConfirm = (blob: Blob) => {
    if (!cropState.originalFile) return;
    const croppedFile = new File([blob], cropState.originalFile.name, { type: "image/jpeg" });
    setCropState({ open: false, src: null, originalFile: null });
    onQueue(uploadKey, croppedFile, true);
  };

  return (
    <GroupCard>
      <GroupLabel>{label}</GroupLabel>

      <Dropzone accept="image/*" disabled={saving} onFiles={handleFiles} className={isBgPattern ? "min-h-[168px] py-7" : ""}>
        <DraggerContent isBgPattern={isBgPattern} requiredRatioLabel={requiredRatioLabel} />
      </Dropzone>

      {requiredRatio && (
        <CropModal
          open={cropState.open}
          imageSrc={cropState.src}
          aspect={requiredRatio}
          onCancel={() => setCropState({ open: false, src: null, originalFile: null })}
          onConfirm={handleCropConfirm}
        />
      )}

      {pending.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Pending — will upload on Save.</p>
          <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {pending.map((item) => (
              <PendingTile key={item.id} item={item} onRemove={() => onRemovePending(uploadKey, item.id)} />
            ))}
          </div>
        </div>
      )}

      {value && pending.length === 0 && (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          <SavedTile url={value} onRemove={onRemoveSaved} />
        </div>
      )}
    </GroupCard>
  );
}

// ─── BgPatternImageUpload ───────────────────────────────────────────────────
export function BgPatternImageUpload({
  sectionKey, data, onChange, onQueue, onRemovePending, pendingUploads, saving,
}: {
  sectionKey: string;
  data: any;
  onChange: (section: string, field: string, value: any) => void;
  onQueue: (key: string, file: File, single: boolean) => void;
  onRemovePending: (key: string, id: string) => void;
  pendingUploads: PendingUploads;
  saving?: boolean;
}) {
  return (
    <SingleImageUpload
      label="Background Pattern"
      uploadKey={`${sectionKey}::bgPattern`}
      value={data.bgPattern}
      saving={saving}
      onQueue={onQueue}
      onRemovePending={onRemovePending}
      onRemoveSaved={() => onChange(sectionKey, "bgPattern", null)}
      pendingUploads={pendingUploads}
      variant="backgroundPattern"
    />
  );
}

// ─── ArrayMediaUpload ───────────────────────────────────────────────────────
export function ArrayMediaUpload({
  label, imageUploadKey, videoUploadKey,
  imageValues = [], videoValues = [], saving,
  onQueueImage, onQueueVideo, onRemovePendingImage, onRemovePendingVideo,
  onRemoveOneImage, onRemoveOneVideo, pendingUploads = {},
  requiredRatio = null, requiredRatioLabel = "",
}: {
  label: string;
  imageUploadKey: string;
  videoUploadKey: string;
  imageValues?: string[];
  videoValues?: string[];
  saving?: boolean;
  onQueueImage: (key: string, file: File, single: boolean) => void;
  onQueueVideo: (key: string, file: File, single: boolean) => void;
  onRemovePendingImage: (key: string, id: string) => void;
  onRemovePendingVideo: (key: string, id: string) => void;
  onRemoveOneImage: (index: number) => void;
  onRemoveOneVideo: (index: number) => void;
  pendingUploads?: PendingUploads;
  requiredRatio?: number | null;
  requiredRatioLabel?: string;
}) {
  const pendingImages = pendingUploads[imageUploadKey] || [];
  const pendingVideos = pendingUploads[videoUploadKey] || [];
  const [cropState, setCropState] = useState<{ open: boolean; src: string | null; originalFile: File | null }>({ open: false, src: null, originalFile: null });

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (file.size / 1024 / 1024 >= 100) {
      toast.error("File must be smaller than 100MB.");
      return;
    }

    if (file.type?.startsWith("video/")) {
      onQueueVideo(videoUploadKey, file, false);
      return;
    }

    if (file.type?.startsWith("image/")) {
      if (file.size / 1024 / 1024 >= 25) {
        toast.error("Image must be smaller than 25MB.");
        return;
      }
      if (requiredRatio) {
        const reader = new FileReader();
        reader.onload = (e) => setCropState({ open: true, src: e.target?.result as string, originalFile: file });
        reader.readAsDataURL(file);
      } else {
        onQueueImage(imageUploadKey, file, false);
      }
      return;
    }

    toast.error("Only image or video files are allowed.");
  };

  const handleCropConfirm = (blob: Blob) => {
    if (!cropState.originalFile) return;
    const croppedFile = new File([blob], cropState.originalFile.name, { type: "image/jpeg" });
    setCropState({ open: false, src: null, originalFile: null });
    onQueueImage(imageUploadKey, croppedFile, false);
  };

  return (
    <GroupCard>
      <GroupLabel>{label}</GroupLabel>

      <Dropzone accept="image/*,video/*" multiple disabled={saving} onFiles={handleFiles}>
        <div className="flex justify-center gap-3">
          <ImageIcon className="size-9 text-primary" />
          <VideoIcon className="size-9 text-violet-500" />
        </div>
        <p className="text-sm font-medium">Drop an image or video here, or click to browse</p>
        <p className="text-xs text-muted-foreground">
          {`Images will be used as banner${requiredRatioLabel ? ` (ratio ${requiredRatioLabel})` : ""}. Videos will be used as video background. Files are uploaded when you click Save.`}
        </p>
      </Dropzone>

      {requiredRatio && (
        <CropModal
          open={cropState.open}
          imageSrc={cropState.src}
          aspect={requiredRatio}
          onCancel={() => setCropState({ open: false, src: null, originalFile: null })}
          onConfirm={handleCropConfirm}
        />
      )}

      {pendingImages.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ImageIcon className="size-3.5" /> Pending images — will upload on Save.</p>
          <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {pendingImages.map((item) => (
              <PendingTile key={item.id} item={item} onRemove={() => onRemovePendingImage(imageUploadKey, item.id)} />
            ))}
          </div>
        </div>
      )}

      {pendingVideos.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><VideoIcon className="size-3.5" /> Pending videos — will upload on Save.</p>
          <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {pendingVideos.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-[10px] border border-dashed border-violet-400/50 bg-violet-500/5">
                <div className="relative w-full pt-[56.25%]">
                  <video src={item.previewUrl} className="absolute inset-0 size-full object-cover" muted playsInline />
                </div>
                <div className="flex min-h-10 items-center justify-between px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                    <Clock className="size-3.5" /> Pending
                  </span>
                  <Button size="sm" variant="ghost" className="h-auto p-0 font-semibold text-destructive hover:text-destructive" onClick={() => onRemovePendingVideo(videoUploadKey, item.id)}>
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {imageValues.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ImageIcon className="size-3.5" /> Saved images</p>
          <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {imageValues.map((url, index) => (
              <SavedTile key={`img-${url}-${index}`} url={url} onRemove={() => onRemoveOneImage(index)} />
            ))}
          </div>
        </div>
      )}

      {videoValues.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><VideoIcon className="size-3.5" /> Saved videos</p>
          <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {videoValues.map((url, index) => (
              <SavedTile key={`vid-${url}-${index}`} url={url} isVideo onRemove={() => onRemoveOneVideo(index)} />
            ))}
          </div>
        </div>
      )}
    </GroupCard>
  );
}

// ─── ArrayImageUpload ───────────────────────────────────────────────────────
export function ArrayImageUpload({
  label, uploadKey, values = [], saving,
  onQueue, onRemovePending, onRemoveOne, pendingUploads = {},
  requiredRatio = null, requiredRatioLabel = "",
}: {
  label: string;
  uploadKey: string;
  values?: string[];
  saving?: boolean;
  onQueue: (key: string, file: File, single: boolean) => void;
  onRemovePending: (key: string, id: string) => void;
  onRemoveOne: (index: number) => void;
  pendingUploads?: PendingUploads;
  requiredRatio?: number | null;
  requiredRatioLabel?: string;
}) {
  const pending = pendingUploads[uploadKey] || [];
  const [cropState, setCropState] = useState<{ open: boolean; src: string | null; originalFile: File | null }>({ open: false, src: null, originalFile: null });

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file || !validateImage(file)) return;

    if (requiredRatio) {
      const reader = new FileReader();
      reader.onload = (e) => setCropState({ open: true, src: e.target?.result as string, originalFile: file });
      reader.readAsDataURL(file);
    } else {
      onQueue(uploadKey, file, false);
    }
  };

  const handleCropConfirm = (blob: Blob) => {
    if (!cropState.originalFile) return;
    const croppedFile = new File([blob], cropState.originalFile.name, { type: "image/jpeg" });
    setCropState({ open: false, src: null, originalFile: null });
    onQueue(uploadKey, croppedFile, false);
  };

  return (
    <GroupCard>
      <GroupLabel>{label}</GroupLabel>

      <Dropzone accept="image/*" multiple disabled={saving} onFiles={handleFiles}>
        <DraggerContent requiredRatioLabel={requiredRatioLabel} />
      </Dropzone>

      {requiredRatio && (
        <CropModal
          open={cropState.open}
          imageSrc={cropState.src}
          aspect={requiredRatio}
          onCancel={() => setCropState({ open: false, src: null, originalFile: null })}
          onConfirm={handleCropConfirm}
        />
      )}

      {pending.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Pending — will upload on Save.</p>
          <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {pending.map((item) => (
              <PendingTile key={item.id} item={item} onRemove={() => onRemovePending(uploadKey, item.id)} />
            ))}
          </div>
        </div>
      )}

      {values.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Saved images</p>
          <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {values.map((url, index) => (
              <SavedTile key={`${url}-${index}`} url={url} onRemove={() => onRemoveOne(index)} />
            ))}
          </div>
        </div>
      )}
    </GroupCard>
  );
}
