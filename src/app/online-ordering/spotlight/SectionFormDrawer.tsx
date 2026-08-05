"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LayoutPanelTop, X } from "lucide-react";

import { createSection } from "@/services/sections/create";
import { updateSection } from "@/services/sections/update";
import { getSingleSection } from "@/services/sections/getSingle";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchProductsList } from "@/services/products/list";
import { listAllDeals } from "@/services/sales/listDeals";
import { listBusinessEntities } from "@/services/businessEntities/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
import { Field, ShopMultiSelect } from "@/components/admin/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUBJECT_TYPES = [
  { value: "BRANDS", label: "Brand" },
  { value: "CATEGORIES", label: "Category" },
  { value: "PRODUCTS", label: "Product" },
  { value: "DEALS", label: "Deal" },
];

interface FormValues {
  title: string;
  businessEntityId: string | number | null;
  subject: string | null;
  targetId: string | number | null;
  shopIds: (string | number)[];
  isEnabled: boolean;
}

const EMPTY_VALUES: FormValues = {
  title: "",
  businessEntityId: null,
  subject: null,
  targetId: null,
  shopIds: [],
  isEnabled: true,
};

export default function SectionFormDrawer({
  open,
  mode,
  sectionId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "add" | "edit";
  sectionId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deals, setDeals] = useState<{ id: string | number; name: string }[]>([]);
  const [entities, setEntities] = useState<{ id: string | number; name: string }[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    listAllDeals().then((res) => setDeals(res?.data?.data?.deals ?? []));

    setEntitiesLoading(true);
    listBusinessEntities()
      .then((res) => setEntities(res?.data?.data?.businessEntities ?? []))
      .catch((err: any) => toast.error(err?.message || "Failed to load business entities"))
      .finally(() => setEntitiesLoading(false));

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      return;
    }

    if (mode === "edit" && sectionId) {
      setLoading(true);
      getSingleSection(sectionId)
        .then((section) => {
          if (!section) {
            toast.error("Section not found");
            return;
          }
          const target =
            section.brands?.[0]?.id ?? section.categories?.[0]?.id ?? section.products?.[0]?.id ?? section.deals?.[0]?.id ?? null;
          setValues({
            title: section.title ?? "",
            businessEntityId: section.businessEntityId ?? null,
            subject: section.subject ?? null,
            targetId: target,
            shopIds: section.shopIds ?? [],
            isEnabled: !section.isDisabled,
          });
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load section"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, sectionId]);

  const handleSave = async () => {
    if (!values.title.trim()) return toast.error("Please enter title");
    if (!values.subject) return toast.error("Please select subject");
    if (values.shopIds.length === 0) return toast.error("Please select at least one shop");

    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: values.title,
        subject: values.subject,
        shopIds: values.shopIds,
        isDisabled: !values.isEnabled,
        businessEntityId: values.businessEntityId || null,
        targetBrandIds: values.subject === "BRANDS" && values.targetId ? [values.targetId] : [],
        targetCategoryIds: values.subject === "CATEGORIES" && values.targetId ? [values.targetId] : [],
        targetProductIds: values.subject === "PRODUCTS" && values.targetId ? [values.targetId] : [],
        targetDealIds: values.subject === "DEALS" && values.targetId ? [values.targetId] : [],
      };

      if (mode === "add") {
        await createSection(body);
        toast.success("Section added successfully!");
      } else {
        await updateSection({ id: sectionId, ...body });
        toast.success("Section updated successfully!");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit section");
    } finally {
      setSaving(false);
    }
  };

  const targetLabel =
    values.subject === "BRANDS"
      ? "Select Brand"
      : values.subject === "CATEGORIES"
        ? "Select Category"
        : values.subject === "PRODUCTS"
          ? "Select Product"
          : "Select Deal";

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <LayoutPanelTop className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Section" : "Edit Section"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new section" : "Update section details"}
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
              <Field label="Title" required>
                <Input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
              </Field>

              <Field label="Business Entity">
                <Select
                  items={[
                    { value: "__none__", label: "None" },
                    ...entities.map((e) => ({ value: String(e.id), label: e.name })),
                  ]}
                  value={values.businessEntityId ? String(values.businessEntityId) : "__none__"}
                  onValueChange={(v) => setValues({ ...values, businessEntityId: v === "__none__" ? null : v })}
                  disabled={entitiesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select business entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Subject" required>
                <Select
                  items={SUBJECT_TYPES}
                  value={values.subject ?? ""}
                  onValueChange={(v) => setValues({ ...values, subject: v, targetId: null })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {values.subject === "BRANDS" && (
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

              {values.subject === "CATEGORIES" && (
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

              {values.subject === "PRODUCTS" && (
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

              {values.subject === "DEALS" && (
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
