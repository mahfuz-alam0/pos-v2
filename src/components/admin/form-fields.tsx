"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

import { uploadAnySingleFile } from "@/services/storage/uploadFile";

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
