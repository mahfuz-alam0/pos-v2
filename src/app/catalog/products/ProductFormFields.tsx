"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";

import { uploadAnySingleFile } from "@/services/storage/uploadFile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiSelect } from "@/components/ui/api-select";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface UomOption {
  id: string;
  name: string;
}

export interface UploadedImage {
  url: string;
  name?: string;
}

export interface RangeField {
  value: string;
  unit: string;
  description: string;
  isRangeApplicable: boolean;
  min: string;
  max: string;
}

export interface ProductFormValues {
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  productProfile: "CANNABIS" | "REGULAR";
  unitWeight: string;
  unitWeightUomId: string | null;
  packagedUnitWeight: string;
  packagedUnitWeightUomId: string | null;
  ean: string;
  sku: string;
  details: string;
  cannabisType: string;
  otherCannabisType: string;
}

export const EMPTY_PRODUCT_VALUES: ProductFormValues = {
  name: "",
  categoryId: null,
  categoryName: null,
  brandId: null,
  brandName: null,
  productProfile: "CANNABIS",
  unitWeight: "",
  unitWeightUomId: null,
  packagedUnitWeight: "",
  packagedUnitWeightUomId: null,
  ean: "",
  sku: "",
  details: "",
  cannabisType: "",
  otherCannabisType: "",
};

export const EMPTY_RANGE: RangeField = { value: "", unit: "%", description: "", isRangeApplicable: false, min: "", max: "" };

export const EFFECTS = [
  "Euphoric", "Relaxing", "Happy", "Sociable", "Creative", "Uplifting", "Energizing",
  "Focused", "Time-altering", "Heightened", "Appetite-inducing", "Pain-relieving",
  "Anxiety-reducing", "Stress-relieving", "Sedative", "Sleep-inducing",
  "Music/art-enhancing", "Introspective", "Well-being-promoting", "Joyful",
];

export const CANNABIS_TYPES = ["Indica", "Sativa", "Hybrid", "Other"];

export function isValidVideoUrl(url: string) {
  if (!url || url.trim() === "") return true;
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)/i;
  const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\//i;
  return youtubeRegex.test(url) || vimeoRegex.test(url);
}

export function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 ring-1 ring-foreground/10">
      <div className="mb-3 text-sm font-semibold text-foreground">{title}</div>
      {children}
    </div>
  );
}

export function UnitToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex w-full rounded-lg bg-muted p-0.5">
      {["%", "mg"].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-[7px] px-2 py-1 text-xs font-medium transition-colors ${
            value === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function ImagesUpload({ images, onChange }: { images: UploadedImage[]; onChange: (imgs: UploadedImage[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList).slice(0, Math.max(0, 3 - images.length));
    if (incoming.length === 0) {
      toast.warning("Maximum 3 images allowed");
      return;
    }
    setUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of incoming) {
        if (!file.type.startsWith("image/")) {
          toast.error("You can only upload image files!");
          continue;
        }
        if (file.size / 1024 / 1024 >= 1) {
          toast.error("Image must be smaller than 1MB!");
          continue;
        }
        const res = await uploadAnySingleFile(file);
        const url = res?.downloadUrl || res?.url;
        if (url) uploaded.push({ url, name: file.name });
      }
      if (uploaded.length > 0) onChange([...images, ...uploaded]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image(s)");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => !uploading && images.length < 3 && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-6 text-center transition-colors ${
          images.length >= 3 ? "pointer-events-none opacity-50" : "hover:bg-muted/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="size-6 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">{uploading ? "Uploading..." : "Click to upload images"}</p>
        <p className="text-xs text-muted-foreground">Up to 3 images, max 1MB each.</p>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={`${img.url}-${i}`} className="group relative size-20 overflow-hidden rounded-lg ring-1 ring-foreground/10">
              <img src={img.url} alt={img.name || "product"} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateEntityFetchers {
  fetchCategoryPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  fetchBrandPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  fetchStrainPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  fetchTagPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
}

interface ProductFormFieldsProps extends CreateEntityFetchers {
  values: ProductFormValues;
  set: <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) => void;
  strainIds: string[];
  setStrainIds: (ids: string[]) => void;
  tagIds: string[];
  setTagIds: (ids: string[]) => void;
  videoLinks: string[];
  addVideoLink: () => void;
  changeVideoLink: (i: number, val: string) => void;
  removeVideoLink: (i: number) => void;
  images: UploadedImage[];
  setImages: (imgs: UploadedImage[]) => void;
  thc: RangeField;
  setThc: (v: RangeField) => void;
  cbd: RangeField;
  setCbd: (v: RangeField) => void;
  effects: string[];
  setEffects: (v: string[]) => void;
  terpenes: { key: string; value: string }[];
  addTerpene: () => void;
  changeTerpene: (i: number, field: "key" | "value", val: string) => void;
  removeTerpene: (i: number) => void;
  uomLists: UomOption[];
  refreshKeys: { category: number; brand: number; strain: number; tag: number };
  onCreateNew: (type: "category" | "brand" | "strain" | "tag") => void;
}

export default function ProductFormFields({
  values,
  set,
  strainIds,
  setStrainIds,
  tagIds,
  setTagIds,
  videoLinks,
  addVideoLink,
  changeVideoLink,
  removeVideoLink,
  images,
  setImages,
  thc,
  setThc,
  cbd,
  setCbd,
  effects,
  setEffects,
  terpenes,
  addTerpene,
  changeTerpene,
  removeTerpene,
  uomLists,
  refreshKeys,
  onCreateNew,
  fetchCategoryPage,
  fetchBrandPage,
  fetchStrainPage,
  fetchTagPage,
}: ProductFormFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Name" required>
            <Input className="h-9" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter product name" />
          </Field>
          <Field label="Category">
            <ApiSelect
              key={refreshKeys.category}
              placeholder="Select Category"
              value={values.categoryId}
              onChange={(val, option) => {
                set("categoryId", val as string | null);
                set("categoryName", option?.name ?? null);
              }}
              fetchPage={fetchCategoryPage}
              triggerClassName="w-full"
              initialLabel={values.categoryName ?? undefined}
              onCreateNew={() => onCreateNew("category")}
              createLabel="Create New Category"
            />
          </Field>
          <Field label="Brand">
            <ApiSelect
              key={refreshKeys.brand}
              placeholder="Select Brand"
              value={values.brandId}
              onChange={(val, option) => {
                set("brandId", val as string | null);
                set("brandName", option?.name ?? null);
              }}
              fetchPage={fetchBrandPage}
              triggerClassName="w-full"
              initialLabel={values.brandName ?? undefined}
              onCreateNew={() => onCreateNew("brand")}
              createLabel="Create New Brand"
            />
          </Field>
          <Field label="Profile" required>
            <Select
              items={[{ value: "CANNABIS", label: "Cannabis Products" }, { value: "REGULAR", label: "Regular Products" }]}
              value={values.productProfile}
              onValueChange={(v) => set("productProfile", v as "CANNABIS" | "REGULAR")}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select product profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CANNABIS">Cannabis Products</SelectItem>
                <SelectItem value="REGULAR">Regular Products</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Weights & Identifiers">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Unit Weight">
            <div className="flex gap-1.5">
              <Input
                type="number"
                value={values.unitWeight}
                onChange={(e) => set("unitWeight", e.target.value)}
                placeholder="Enter unit weight"
                className="h-9 flex-1"
              />
              <Select
                items={uomLists.map((u) => ({ value: u.id, label: u.name }))}
                value={values.unitWeightUomId ?? undefined}
                onValueChange={(v) => set("unitWeightUomId", v as string)}
              >
                <SelectTrigger className="h-9 w-28">
                  <SelectValue placeholder="UoM" />
                </SelectTrigger>
                <SelectContent>
                  {uomLists.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
          <Field label="Packaged Unit Weight">
            <div className="flex gap-1.5">
              <Input
                type="number"
                value={values.packagedUnitWeight}
                onChange={(e) => set("packagedUnitWeight", e.target.value)}
                placeholder="Enter package unit weight"
                className="h-9 flex-1"
              />
              <Select
                items={uomLists.map((u) => ({ value: u.id, label: u.name }))}
                value={values.packagedUnitWeightUomId ?? undefined}
                onValueChange={(v) => set("packagedUnitWeightUomId", v as string)}
              >
                <SelectTrigger className="h-9 w-28">
                  <SelectValue placeholder="UoM" />
                </SelectTrigger>
                <SelectContent>
                  {uomLists.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
          <Field label="EAN">
            <Input className="h-9" value={values.ean} onChange={(e) => set("ean", e.target.value)} placeholder="Enter ean" />
          </Field>
          <Field label="SKU">
            <Input className="h-9" value={values.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Enter sku" />
          </Field>
        </div>
      </Section>

      <Section title="Classification & Tags">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Strains">
            <MultiApiSelect
              key={refreshKeys.strain}
              placeholder="Select Strain"
              value={strainIds}
              onChange={setStrainIds}
              fetchPage={fetchStrainPage}
              triggerClassName="w-full"
              onCreateNew={() => onCreateNew("strain")}
              createLabel="Create New Strain"
            />
          </Field>
          <Field label="Tags">
            <MultiApiSelect
              key={refreshKeys.tag}
              placeholder="Select Tag"
              value={tagIds}
              onChange={setTagIds}
              fetchPage={fetchTagPage}
              triggerClassName="w-full"
              onCreateNew={() => onCreateNew("tag")}
              createLabel="Create New Tag"
            />
          </Field>

          <div className="md:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Video Links (YouTube/Vimeo)</span>
              <Button type="button" variant="outline" size="sm" onClick={addVideoLink}>
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              {videoLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    value={link}
                    placeholder="https://www.youtube.com/watch?v=..."
                    onChange={(e) => changeVideoLink(i, e.target.value)}
                    className={`h-9 ${link && !isValidVideoUrl(link) ? "border-destructive" : ""}`}
                  />
                  {videoLinks.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVideoLink(i)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {videoLinks.some((l) => l && !isValidVideoUrl(l)) && (
                <p className="text-xs text-destructive">Please enter valid YouTube or Vimeo URLs</p>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Field label="Product Description">
              <Textarea
                value={values.details}
                onChange={(e) => set("details", e.target.value)}
                placeholder="Enter product description..."
                rows={4}
              />
            </Field>
          </div>
        </div>
      </Section>

      {values.productProfile === "CANNABIS" && (
        <Section title="Cannabis Product Data">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {([
              { label: "THC", state: thc, setState: setThc },
              { label: "CBD", state: cbd, setState: setCbd },
            ] as const).map(({ label, state, setState }) => (
              <div key={label} className="rounded-lg p-3 ring-1 ring-foreground/10">
                <div className="mb-2 text-sm font-semibold">{label}</div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <Field label="Value">
                    <Input className="h-9"
                      type="number"
                      placeholder="0.00"
                      value={state.value}
                      onChange={(e) => setState({ ...state, value: e.target.value })}
                    />
                  </Field>
                  <Field label="Unit">
                    <UnitToggle value={state.unit} onChange={(v) => setState({ ...state, unit: v })} />
                  </Field>
                </div>
                <Field label="Description" className="mb-2">
                  <Textarea
                    placeholder="Optional"
                    rows={2}
                    value={state.description}
                    onChange={(e) => setState({ ...state, description: e.target.value })}
                  />
                </Field>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={state.isRangeApplicable}
                    onCheckedChange={(checked) =>
                      setState({ ...state, isRangeApplicable: !!checked, min: "", max: "" })
                    }
                  />
                  Enable Range
                </label>
                {state.isRangeApplicable && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Min" required>
                      <Input className="h-9" type="number" placeholder="Min" value={state.min} onChange={(e) => setState({ ...state, min: e.target.value })} />
                    </Field>
                    <Field label="Max" required>
                      <Input className="h-9" type="number" placeholder="Max" value={state.max} onChange={(e) => setState({ ...state, max: e.target.value })} />
                    </Field>
                  </div>
                )}
              </div>
            ))}

            <Field label="Effects">
              <MultiApiSelect
                placeholder="Select effects"
                value={effects}
                onChange={setEffects}
                items={EFFECTS.map((e) => ({ id: e, name: e }))}
                triggerClassName="w-full"
              />
            </Field>

            <Field label="Cannabis Type">
              <Select
                items={CANNABIS_TYPES.map((t) => ({ value: t, label: t }))}
                value={values.cannabisType || undefined}
                onValueChange={(v) => set("cannabisType", v as string)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CANNABIS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {values.cannabisType === "Other" && (
              <Field label="Specify Type" required>
                <Input className="h-9" value={values.otherCannabisType} onChange={(e) => set("otherCannabisType", e.target.value)} placeholder="Enter type" />
              </Field>
            )}

            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Terpene Profiles</span>
                <Button type="button" size="sm" onClick={addTerpene}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {terpenes.map((pair, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input className="h-9"
                      value={pair.key}
                      onChange={(e) => changeTerpene(i, "key", e.target.value)}
                      placeholder="Profile name"
                    />
                    <Input className="h-9"
                      type="number"
                      value={pair.value}
                      onChange={(e) => changeTerpene(i, "value", e.target.value)}
                      placeholder="Value (%)"
                    />
                    <Button type="button" variant="ghost" size="icon" disabled={terpenes.length === 1} onClick={() => removeTerpene(i)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Media">
        <ImagesUpload images={images} onChange={setImages} />
      </Section>
    </div>
  );
}
