"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, X } from "lucide-react";

import { createBanner } from "@/services/banners/create";
import { updateBanner } from "@/services/banners/update";
import { getSingleBanner } from "@/services/banners/getSingle";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchProductsList } from "@/services/products/list";
import { listAllDeals } from "@/services/sales/listDeals";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
import { Field, ShopMultiSelect, SingleImageUpload } from "@/components/admin/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BannerType } from "./types";

const DURATIONS = Array.from({ length: 9 }, (_, i) => (i + 1) * 5);
const PROMOTION_TYPES = [
  { value: "BRANDS", label: "Brand" },
  { value: "CATEGORIES", label: "Category" },
  { value: "PRODUCTS", label: "Product" },
  { value: "DEALS", label: "Deal" },
];

interface FormValues {
  title: string;
  duration: number | null;
  promotionType: string | null;
  targetId: string | number | null;
  shopIds: (string | number)[];
  imageUrl: string | null;
  isEnabled: boolean;
}

const EMPTY_VALUES: FormValues = {
  title: "",
  duration: null,
  promotionType: null,
  targetId: null,
  shopIds: [],
  imageUrl: null,
  isEnabled: true,
};

export default function BannerFormDrawer({
  open,
  mode,
  bannerId,
  bannerType,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "add" | "edit";
  bannerId: string | number | null;
  bannerType: BannerType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deals, setDeals] = useState<{ id: string | number; name: string }[]>([]);

  const isTargetLocked = bannerType === "CATEGORIES" || bannerType === "BRANDS";

  useEffect(() => {
    if (!open) return;

    listAllDeals().then((res) => setDeals(res?.data?.data?.deals ?? []));

    if (mode === "add") {
      setValues({
        ...EMPTY_VALUES,
        promotionType: isTargetLocked ? bannerType : null,
      });
      return;
    }

    if (mode === "edit" && bannerId) {
      setLoading(true);
      getSingleBanner(bannerId)
        .then((banner) => {
          if (!banner) {
            toast.error("Banner not found");
            return;
          }
          const target =
            banner.brands?.[0]?.id ?? banner.categories?.[0]?.id ?? banner.products?.[0]?.id ?? banner.deals?.[0]?.id ?? null;
          setValues({
            title: banner.title ?? "",
            duration: banner.bannerDuration ?? null,
            promotionType: banner.subject ?? null,
            targetId: target,
            shopIds: banner.shopIds ?? [],
            imageUrl: banner.imageUrl ?? null,
            isEnabled: !banner.isDisabled,
          });
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load banner"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, bannerId, bannerType, isTargetLocked]);

  const handleSave = async () => {
    if (!values.title.trim()) return toast.error("Please enter banner title");
    if (!values.duration) return toast.error("Please select duration");
    if (!values.promotionType) return toast.error("Please select promotion type");
    if (values.shopIds.length === 0) return toast.error("Please select at least one shop");
    if (!values.imageUrl) return toast.error("Please upload a banner image");

    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: values.title,
        bannerDuration: values.duration,
        subject: values.promotionType,
        bannerType,
        shopIds: values.shopIds,
        imageUrl: values.imageUrl,
        isDisabled: !values.isEnabled,
        targetBrandIds: values.promotionType === "BRANDS" && values.targetId ? [values.targetId] : [],
        targetCategoryIds: values.promotionType === "CATEGORIES" && values.targetId ? [values.targetId] : [],
        targetProductIds: values.promotionType === "PRODUCTS" && values.targetId ? [values.targetId] : [],
        targetDealIds: values.promotionType === "DEALS" && values.targetId ? [values.targetId] : [],
      };

      if (mode === "add") {
        await createBanner(body);
        toast.success("Banner created successfully");
      } else {
        await updateBanner({ id: bannerId, ...body });
        toast.success("Banner updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit banner");
    } finally {
      setSaving(false);
    }
  };

  const targetLabel =
    values.promotionType === "BRANDS"
      ? "Select Brand"
      : values.promotionType === "CATEGORIES"
        ? "Select Category"
        : values.promotionType === "PRODUCTS"
          ? "Select Product"
          : "Select Deal";

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ImageIcon className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Banner" : "Edit Banner"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new banner" : "Update banner details"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Banner Title" required>
                <Input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
              </Field>

              <Field label="Banner Duration (seconds)" required>
                <Select
                  items={DURATIONS.map((d) => ({ value: String(d), label: `${d} seconds` }))}
                  value={values.duration ? String(values.duration) : ""}
                  onValueChange={(v) => setValues({ ...values, duration: Number(v) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} seconds
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Promotion Type" required>
                <Select
                  items={PROMOTION_TYPES}
                  value={values.promotionType ?? ""}
                  onValueChange={(v) => setValues({ ...values, promotionType: v, targetId: null })}
                  disabled={isTargetLocked}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select promotion type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMOTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {values.promotionType === "BRANDS" && (
                <Field label={targetLabel}>
                  <ApiSelect
                    placeholder={targetLabel}
                    value={values.targetId}
                    onChange={(id) => setValues({ ...values, targetId: id })}
                    fetchPage={async (page, search) => {
                      const res = await fetchBrandsList({ page, limit: 20, search });
                      return { items: res?.data ?? [], totalPages: res?.paginationData?.totalPages ?? 1 };
                    }}
                    className="w-full"
                    triggerClassName="w-full"
                  />
                </Field>
              )}

              {values.promotionType === "CATEGORIES" && (
                <Field label={targetLabel}>
                  <ApiSelect
                    placeholder={targetLabel}
                    value={values.targetId}
                    onChange={(id) => setValues({ ...values, targetId: id })}
                    fetchPage={async (page, search) => {
                      const res = await fetchCategoriesList({ page, limit: 20, search });
                      return { items: res?.data ?? [], totalPages: res?.paginationData?.totalPages ?? 1 };
                    }}
                    className="w-full"
                    triggerClassName="w-full"
                  />
                </Field>
              )}

              {values.promotionType === "PRODUCTS" && (
                <Field label={targetLabel}>
                  <ApiSelect
                    placeholder={targetLabel}
                    value={values.targetId}
                    onChange={(id) => setValues({ ...values, targetId: id })}
                    fetchPage={async (page, search) => {
                      const res = await fetchProductsList({ page, limit: 20, search });
                      return { items: res?.data ?? [], totalPages: res?.paginationData?.totalPages ?? 1 };
                    }}
                    className="w-full"
                    triggerClassName="w-full"
                  />
                </Field>
              )}

              {values.promotionType === "DEALS" && (
                <Field label={targetLabel}>
                  <Select
                    items={deals.map((d) => ({ value: String(d.id), label: d.name }))}
                    value={values.targetId ? String(values.targetId) : ""}
                    onValueChange={(v) => setValues({ ...values, targetId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select deal" />
                    </SelectTrigger>
                    <SelectContent>
                      {deals.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Field label="Select Shop" required>
                <ShopMultiSelect
                  value={values.shopIds}
                  onChange={(ids) => setValues({ ...values, shopIds: ids })}
                />
              </Field>

              <Field label="Banner Image" required>
                <SingleImageUpload
                  imageUrl={values.imageUrl}
                  onChange={(url) => setValues({ ...values, imageUrl: url })}
                />
              </Field>

              <div className="flex items-center gap-3">
                <Switch checked={values.isEnabled} onCheckedChange={(v) => setValues({ ...values, isEnabled: v })} />
                <span className="text-sm">Enable</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
