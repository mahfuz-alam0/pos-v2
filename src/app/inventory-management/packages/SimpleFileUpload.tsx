"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { uploadAnySingleFile } from "@/services/storage/uploadFile";

export interface UploadedDoc {
  url: string;
  name?: string;
}

interface SimpleFileUploadProps {
  files: UploadedDoc[];
  onChange: (files: UploadedDoc[]) => void;
  maxCount?: number;
  accept?: string;
  hint?: string;
  icon?: React.ReactNode;
}

// Minimal drag-and-drop-or-click uploader. Uploads each selected file
// immediately via the storage-utils single-file-upload endpoint and stores
// the resulting { url, name } pair — no dependency on AntD's Upload.Dragger.
export default function SimpleFileUpload({
  files,
  onChange,
  maxCount = 5,
  accept,
  hint,
  icon,
}: SimpleFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList).slice(0, Math.max(0, maxCount - files.length));
    if (incoming.length === 0) {
      toast.warning(`Maximum ${maxCount} files allowed`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: UploadedDoc[] = [];
      for (const file of incoming) {
        const res = await uploadAnySingleFile(file);
        const url = res?.downloadUrl || res?.url;
        if (url) uploaded.push({ url, name: file.name });
      }
      if (uploaded.length > 0) {
        onChange([...files, ...uploaded]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload file(s)");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver ? "border-primary bg-muted/50" : "border-muted-foreground/25 hover:bg-muted/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          icon ?? <Upload className="size-6 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {uploading ? "Uploading..." : "Click or drag files here"}
        </p>
        <p className="text-xs text-muted-foreground">{hint ?? `Max ${maxCount} files.`}</p>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.url}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:underline"
                  title={file.name || file.url}
                >
                  {file.name || file.url}
                </a>
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
