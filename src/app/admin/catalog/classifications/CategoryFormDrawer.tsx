"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FolderTree, X } from "lucide-react";

import { fetchClassificationsList } from "@/services/classifications/list";
import { createCategory } from "@/services/categories/create";
import { updateCategory } from "@/services/categories/update";
import { fetchSingleCategory } from "@/services/categories/getSingle";
import { fetchMetrcCategories, fetchMetrcPurchaseCategoryTypes } from "@/services/categories/metrcDatasets";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, SingleImageUpload } from "./components";

const COLOR_SWATCHES = [
  "#4D4D4D", "#999999", "#FFFFFF", "#F44E3B", "#FE9200", "#FCDC00",
  "#DBDF00", "#A4DD00", "#68CCCA", "#73D8FF", "#AEA1FF", "#FDA1FF",
  "#333333", "#808080", "#cccccc", "#D33115", "#E27300", "#FCC400",
  "#B0BC00", "#68BC00", "#16A5A5", "#009CE0", "#7B64FF", "#FA28FF",
];

interface MetrcOption {
  stringId?: string;
  displayName?: string;
  productCategoryTypeStringId?: string;
  productCategoryType?: string;
}

interface FormValues {
  name: string;
  details: string;
  classificationId: string | number | null;
  metrcCategoryStringId: string | null;
  metrcPurchaseCategoryStringId: string | null;
  colorCode: string;
  image: string | null;
}

const EMPTY_VALUES: FormValues = {
  name: "",
  details: "",
  classificationId: null,
  metrcCategoryStringId: null,
  metrcPurchaseCategoryStringId: null,
  colorCode: "#ffffff",
  image: null,
};

interface CategoryFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  categoryId: string | number | null;
  defaultClassificationId?: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

async function fetchClassificationPage(page: number, search: string) {
  const res = await fetchClassificationsList({ page, limit: 20, search: search || undefined });
  return {
    items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name, isMJ: !!c.isMJ })),
    totalPages: res?.paginationData?.totalPages ?? 1,
  };
}

export default function CategoryFormDrawer({
  open,
  mode,
  categoryId,
  defaultClassificationId,
  onClose,
  onSaved,
}: CategoryFormDrawerProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [classificationIsMJ, setClassificationIsMJ] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metrcCategories, setMetrcCategories] = useState<MetrcOption[]>([]);
  const [metrcPurchaseCategories, setMetrcPurchaseCategories] = useState<MetrcOption[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchMetrcCategories().then((res) => setMetrcCategories(res?.data ?? []));
    fetchMetrcPurchaseCategoryTypes().then((res) => setMetrcPurchaseCategories(res?.data ?? []));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues({ ...EMPTY_VALUES, classificationId: defaultClassificationId ?? null });
      setClassificationIsMJ(false);
      return;
    }

    if (mode === "edit" && categoryId) {
      setLoading(true);
      fetchSingleCategory(categoryId)
        .then((res) => {
          const c = res?.data;
          if (!c) {
            toast.error("Category not found");
            return;
          }
          setValues({
            name: c.name ?? "",
            details: c.details ?? "",
            classificationId: c.classification?.id ?? c.classificationId ?? null,
            metrcCategoryStringId: c.metrcCategoryStringId ?? null,
            metrcPurchaseCategoryStringId: c.metrcPurchaseCategoryStringId ?? null,
            colorCode: c.colorCode || "#ffffff",
            image: c.image ?? null,
          });
          setClassificationIsMJ(!!c.classification?.isMJ);
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load category"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, categoryId, defaultClassificationId]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    if (!values.classificationId) {
      toast.error("Please select a classification");
      return;
    }
    if (classificationIsMJ && (!values.metrcCategoryStringId || !values.metrcPurchaseCategoryStringId)) {
      toast.error("Please select Metrc category and purchase type");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: values.name,
        details: values.details,
        classificationId: values.classificationId,
        colorCode: values.colorCode,
        image: values.image ?? undefined,
        ...(classificationIsMJ
          ? {
              metrcCategoryStringId: values.metrcCategoryStringId,
              metrcPurchaseCategoryStringId: values.metrcPurchaseCategoryStringId,
            }
          : {}),
      };
      if (mode === "add") {
        await createCategory(body);
        toast.success("Category created successfully");
      } else {
        await updateCategory(categoryId!, body);
        toast.success("Category updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FolderTree className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Category" : "Edit Category"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new category" : "Update category details"}
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
              <Field label="Name" required>
                <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
              </Field>

              <Field label="Classification" required>
                <ApiSelect
                  placeholder="Select Classification"
                  value={values.classificationId}
                  onChange={(val, option) => {
                    setValues({
                      ...values,
                      classificationId: val,
                      metrcCategoryStringId: null,
                      metrcPurchaseCategoryStringId: null,
                    });
                    setClassificationIsMJ(!!(option as any)?.isMJ);
                  }}
                  fetchPage={fetchClassificationPage}
                  triggerClassName="w-full"
                />
              </Field>

              {classificationIsMJ && (
                <>
                  <Field label="Metrc Category Type" required>
                    <Select
                      value={values.metrcCategoryStringId ?? ""}
                      onValueChange={(val) =>
                        setValues({ ...values, metrcCategoryStringId: val, metrcPurchaseCategoryStringId: null })
                      }
                      items={metrcCategories.map((t) => ({ value: t.stringId!, label: t.displayName! }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Metrc Category Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {metrcCategories.map((t) => (
                          <SelectItem key={t.stringId} value={t.stringId!}>
                            {t.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Metrc Purchase Type" required>
                    <Select
                      value={values.metrcPurchaseCategoryStringId ?? ""}
                      onValueChange={(val) => setValues({ ...values, metrcPurchaseCategoryStringId: val })}
                      items={metrcPurchaseCategories.map((t) => ({
                        value: t.productCategoryTypeStringId!,
                        label: t.productCategoryType!,
                      }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Metrc Purchase Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {metrcPurchaseCategories.map((t) => (
                          <SelectItem key={t.productCategoryTypeStringId} value={t.productCategoryTypeStringId!}>
                            {t.productCategoryType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}

              <Field label="Description">
                <Input value={values.details} onChange={(e) => setValues({ ...values, details: e.target.value })} />
              </Field>

              <Field label="Color Code">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setValues({ ...values, colorCode: c })}
                        className={`size-6 rounded-full ring-1 ring-foreground/10 ${values.colorCode === c ? "outline-2 outline-offset-1 outline-primary" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={values.colorCode}
                      onChange={(e) => setValues({ ...values, colorCode: e.target.value })}
                      className="size-8 cursor-pointer rounded border border-input bg-transparent p-0"
                    />
                    <span className="text-sm text-muted-foreground">{values.colorCode}</span>
                  </div>
                </div>
              </Field>

              <Field label="Image">
                <SingleImageUpload imageUrl={values.image} onChange={(image) => setValues({ ...values, image })} />
              </Field>
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
