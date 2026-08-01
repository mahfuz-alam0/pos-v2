"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { bulkUpdateProductProps } from "@/services/products/bulkUpdateProps";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchTagsList } from "@/services/tags/list";
import { fetchStrainsList } from "@/services/strains/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiSelect } from "@/components/ui/api-select";
import { MultiApiSelect } from "@/components/ui/multi-api-select";

import { Field, ImagesUpload, type UploadedImage } from "./ProductFormFields";
import type { ProductRow } from "./types";

interface BulkEditDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedProducts: ProductRow[];
  onSaved: () => void;
}

type MergeStrategy = "APPEND" | "REPLACE" | "REMOVE";

function MergeStrategyToggle({ value, onChange }: { value: MergeStrategy; onChange: (v: MergeStrategy) => void }) {
  const options: { value: MergeStrategy; label: string }[] = [
    { value: "APPEND", label: "Add to existing" },
    { value: "REPLACE", label: "Replace" },
    { value: "REMOVE", label: "Remove" },
  ];
  return (
    <div className="flex w-full rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-[7px] px-2 py-1 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function BulkEditDrawer({ open, onClose, selectedProducts, onSaved }: BulkEditDrawerProps) {
  const { shopId } = useShop();

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [brandId, setBrandId] = useState<string | undefined>(undefined);
  const [strainIds, setStrainIds] = useState<string[]>([]);
  const [strainStrategy, setStrainStrategy] = useState<MergeStrategy>("APPEND");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagStrategy, setTagStrategy] = useState<MergeStrategy>("APPEND");
  const [details, setDetails] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoryId(undefined);
    setBrandId(undefined);
    setStrainIds([]);
    setStrainStrategy("APPEND");
    setTagIds([]);
    setTagStrategy("APPEND");
    setDetails("");
    setImages([]);
  }, [open]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast.warning("No products selected");
      return;
    }

    const payload: Record<string, any> = { ids: selectedProducts.map((p) => p.id) };
    if (categoryId !== undefined) payload.categoryId = categoryId;
    if (brandId !== undefined) payload.brandId = brandId;
    if (strainIds.length > 0) {
      payload.strainIds = strainIds;
      payload.strainsMergeStrategy = strainStrategy;
    }
    if (tagIds.length > 0) {
      payload.tagIds = tagIds;
      payload.tagsMergeStrategy = tagStrategy;
    }
    if (details.trim()) payload.details = details.trim();
    if (images.length > 0) payload.images = images.map((img, i) => ({ url: img.url, order: i }));

    if (Object.keys(payload).length === 1) {
      toast.warning("Change at least one field before saving");
      return;
    }

    setSaving(true);
    try {
      await bulkUpdateProductProps(shopId as string | null, payload);
      toast.success(`${selectedProducts.length} product(s) updated successfully`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update products");
    } finally {
      setSaving(false);
    }
  };

  const fetchCategoryPage = async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };
  const fetchBrandPage = async (page: number, search: string) => {
    const res = await fetchBrandsList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };
  const fetchStrainPage = async (page: number, search: string) => {
    const res = await fetchStrainsList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((s: any) => ({ id: s.id, name: s.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };
  const fetchTagPage = async (page: number, search: string) => {
    const res = await fetchTagsList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((t: any) => ({ id: t.id, name: t.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };

  return (
    <Drawer open={open} onClose={handleClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <span className="text-base font-semibold">Bulk Edit ({selectedProducts.length})</span>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 text-xs text-muted-foreground">
            Only fields you change are applied. Leave a field untouched to keep it as-is on all {selectedProducts.length} selected products.
          </p>

          <div className="flex flex-col gap-4">
            <Field label="Category">
              <ApiSelect
                placeholder="Leave unchanged"
                value={categoryId ?? null}
                onChange={(val) => setCategoryId((val as string) ?? undefined)}
                fetchPage={fetchCategoryPage}
                triggerClassName="w-full"
              />
            </Field>

            <Field label="Brand">
              <ApiSelect
                placeholder="Leave unchanged"
                value={brandId ?? null}
                onChange={(val) => setBrandId((val as string) ?? undefined)}
                fetchPage={fetchBrandPage}
                triggerClassName="w-full"
              />
            </Field>

            <Field label="Strains">
              <MultiApiSelect
                placeholder="Leave unchanged"
                value={strainIds}
                onChange={setStrainIds}
                fetchPage={fetchStrainPage}
                triggerClassName="w-full"
              />
              {strainIds.length > 0 && (
                <div className="mt-1.5">
                  <MergeStrategyToggle value={strainStrategy} onChange={setStrainStrategy} />
                </div>
              )}
            </Field>

            <Field label="Tags">
              <MultiApiSelect
                placeholder="Leave unchanged"
                value={tagIds}
                onChange={setTagIds}
                fetchPage={fetchTagPage}
                triggerClassName="w-full"
              />
              {tagIds.length > 0 && (
                <div className="mt-1.5">
                  <MergeStrategyToggle value={tagStrategy} onChange={setTagStrategy} />
                </div>
              )}
            </Field>

            <Field label="Product Description">
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                rows={4}
              />
            </Field>

            <Field label="Images">
              <ImagesUpload images={images} onChange={setImages} />
              {images.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  These images will replace the existing images on all selected products.
                </p>
              )}
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : `Update ${selectedProducts.length}`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
