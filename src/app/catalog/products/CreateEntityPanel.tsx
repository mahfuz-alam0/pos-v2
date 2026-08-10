"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Upload } from "lucide-react";

import { createCategory } from "@/services/categories/create";
import { createBrand } from "@/services/brands/create";
import { createStrain } from "@/services/strains/create";
import { createTag } from "@/services/tags/create";
import { fetchClassificationsList } from "@/services/classifications/list";
import { uploadAnySingleFile } from "@/services/storage/uploadFile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./ProductFormFields";

export type CreateEntityType = "category" | "brand" | "strain" | "tag";

const TITLES: Record<CreateEntityType, string> = {
  category: "Create Category",
  brand: "Create Brand",
  strain: "Create Strain",
  tag: "Create Tag",
};

/** Single-image drop zone shared by the category/brand forms — separate from
 * ProductFormFields' ImagesUpload since these only ever hold one image. */
function SingleImageUpload({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("You can only upload image files!");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadAnySingleFile(file);
      const uploadedUrl = res?.downloadUrl || res?.url;
      if (uploadedUrl) onChange(uploadedUrl);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-6 text-center hover:bg-muted/30"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {url ? (
        <img src={url} alt="" className="size-16 rounded-md object-cover" />
      ) : uploading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="size-6 text-muted-foreground" />
      )}
      <p className="text-sm font-medium">{uploading ? "Uploading..." : url ? "Replace image" : "Click to Upload"}</p>
    </div>
  );
}

export default function CreateEntityPanel({
  type,
  onClose,
  onCreated,
}: {
  type: CreateEntityType;
  onClose: () => void;
  onCreated: (type: CreateEntityType, item: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [highlights, setHighlights] = useState("");
  const [colorCode, setColorCode] = useState("#1677ff");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [classificationId, setClassificationId] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName("");
    setDetails("");
    setHighlights("");
    setColorCode("#1677ff");
    setImageUrl(null);
    setClassificationId(null);
  }, [type]);

  useEffect(() => {
    if (type !== "category") return;
    fetchClassificationsList({ page: 1, limit: 100 })
      .then((res) => setClassifications(res?.data ?? []))
      .catch(() => toast.error("Failed to load classifications"));
  }, [type]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (type === "category" && !classificationId) {
      toast.error("Please select a classification");
      return;
    }

    setSaving(true);
    try {
      let res: any;
      if (type === "category") {
        res = await createCategory({
          name: name.trim(),
          classificationId,
          colorCode,
          highlights: highlights.trim() || null,
          details: details.trim() || null,
          image: imageUrl,
        });
      } else if (type === "brand") {
        res = await createBrand({ name: name.trim(), details: details.trim() || null, image: imageUrl });
      } else if (type === "strain") {
        res = await createStrain({ name: name.trim() });
      } else {
        res = await createTag({ name: name.trim() });
      }

      const createdId = res?.data?.data?.id ?? res?.data?.id;
      toast.success(`${TITLES[type]} created successfully`);
      onCreated(type, { id: createdId, name: name.trim() });
    } catch (err: any) {
      toast.error(err?.message || err?.error || `Failed to create ${type}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full w-100 shrink-0 flex-col border-l border-border">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="text-base font-semibold">{TITLES[type]}</h3>
        <Button variant="outline" size="icon" onClick={onClose} disabled={saving}>
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {type === "category" && (
          <Field label="Classification" required>
            <Select
              items={classifications.map((c) => ({ value: c.id, label: c.name }))}
              value={classificationId ?? undefined}
              onValueChange={(v) => setClassificationId(v as string)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select a classification" />
              </SelectTrigger>
              <SelectContent>
                {classifications.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label={type === "brand" ? "Brand Name" : `${type[0].toUpperCase()}${type.slice(1)} Name`} required>
          <Input className="h-9"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter ${type} name`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && type !== "category" && type !== "brand") handleSave();
            }}
          />
        </Field>

        {type === "category" && (
          <Field label="Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input p-1"
              />
              <span className="text-sm text-muted-foreground">{colorCode}</span>
            </div>
          </Field>
        )}

        {type === "category" && (
          <Field label="Highlights">
            <Textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="Enter highlights" rows={2} />
          </Field>
        )}

        {(type === "category" || type === "brand") && (
          <Field label={type === "brand" ? "Brand Description" : "Details"}>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Message" rows={type === "category" ? 3 : 2} />
          </Field>
        )}

        {(type === "category" || type === "brand") && (
          <Field label={type === "brand" ? "Brand Image" : "Category Image"}>
            <SingleImageUpload url={imageUrl} onChange={setImageUrl} />
          </Field>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border p-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
