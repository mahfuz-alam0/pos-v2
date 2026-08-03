"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Upload, X } from "lucide-react";

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

  return (
    <div className="flex flex-col gap-2">
      {variant === "button" && (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="flex w-fit items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm text-foreground hover:bg-muted/40 disabled:opacity-50"
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload
        </button>
      )}
      {links.map((link, i) => (
        <div key={i} className="flex items-center justify-between rounded-md ring-1 ring-foreground/10 px-3 py-2">
          <a href={link} target="_blank" rel="noreferrer" className="truncate text-sm text-primary hover:underline">
            Document {i + 1}
          </a>
          <button
            type="button"
            onClick={() => onChange(links.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {variant === "dropzone" && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex h-16 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-muted-foreground border-muted-foreground/25 hover:bg-muted/30"
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Upload className="size-4" />
              <span className="text-sm">Upload documents</span>
            </>
          )}
        </div>
      )}
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
