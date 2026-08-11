"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Layers, Plus, Trash2, X } from "lucide-react";

import { fetchMatrixAttributesList } from "@/services/matrixAttributes/list";
import { fetchSingleMatrixAttribute } from "@/services/matrixAttributes/getSingle";
import { createProductMatrix } from "@/services/productMatrices/create";
import { updateProductMatrix } from "@/services/productMatrices/update";
import { fetchSingleProductMatrix } from "@/services/productMatrices/getSingle";
import { uploadAnyMultipleFiles } from "@/services/storage/uploadMultipleFiles";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";

import ProductPickerDialog from "./ProductPickerDialog";
import type { AssociatedAttribute, ProductCombination } from "./types";

const EMPTY_VALUES = { name: "", details: "" };

function generateCombinations(attributes: AssociatedAttribute[]): ProductCombination[] {
  const recurse = (index: number, combo: ProductCombination): ProductCombination[] => {
    if (index === attributes.length) return [combo];
    const attribute = attributes[index];
    return attribute.values.flatMap((value) => recurse(index + 1, { ...combo, [attribute.name]: value }));
  };
  return attributes.length ? recurse(0, {}) : [];
}

export default function TemplateFormDrawer({
  open,
  mode,
  templateId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "add" | "edit";
  templateId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<AssociatedAttribute[]>([]);
  const [combinations, setCombinations] = useState<ProductCombination[]>([]);
  const [products, setProducts] = useState<ProductCombination[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [pickerCombination, setPickerCombination] = useState<ProductCombination | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      setAttributeIds([]);
      setSelectedAttributes([]);
      setCombinations([]);
      setProducts([]);
      setImages([]);
      return;
    }

    if (mode === "edit" && templateId) {
      setLoading(true);
      fetchSingleProductMatrix(templateId)
        .then((res) => {
          const m = res?.data;
          if (!m) {
            toast.error("Matrix not found");
            return;
          }
          setValues({ name: m.name ?? "", details: m.details ?? "" });
          setImages((m.images ?? []).map((img: any) => img.url));

          const attrs = m.associatedAttributes ?? [];
          setAttributeIds(attrs.map((a: any) => String(a.id)));
          setSelectedAttributes(attrs);
          const combos = generateCombinations(attrs);
          setCombinations(combos);

          const initialProducts = (m.associatedProducts ?? []).map((product: any) => {
            const combo: ProductCombination = { productId: product.id, productName: product.name };
            attrs.forEach((attr: any) => {
              const valueId = product.attributeValueMap?.[attr.id];
              const value = attr.values.find((v: any) => v.valueId === valueId);
              if (value) combo[attr.name] = value;
            });
            return combo;
          });
          setProducts(initialProducts);
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load matrix"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, templateId]);

  const handleAttributesChange = async (ids: string[]) => {
    if (ids.length > 3) {
      toast.error("You can't select more than 3 attributes!");
      return;
    }
    setAttributeIds(ids);

    if (ids.length === 0) {
      setSelectedAttributes([]);
      setCombinations([]);
      setProducts([]);
      return;
    }

    const attrs = await Promise.all(
      ids.map(async (id) => {
        const res = await fetchSingleMatrixAttribute(id);
        return res?.data;
      })
    );
    const formatted: AssociatedAttribute[] = attrs
      .filter(Boolean)
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        values: a.values.map((v: any) => ({ value: v.value, valueId: v.valueId, valueRepresentation: v.valueRepresentation })),
      }));
    setSelectedAttributes(formatted);
    setCombinations(generateCombinations(formatted));
    setProducts([]);
  };

  const findProductForCombination = (combination: ProductCombination) =>
    products.find((product) =>
      Object.keys(combination).every((key) => {
        const a = combination[key] as any;
        const b = (product as any)[key];
        return a?.valueId === b?.valueId;
      })
    );

  const handleProductSelect = (picked: { id: string; productName: string }) => {
    if (!pickerCombination) return;
    if (products.some((p) => p.productId === picked.id)) {
      toast.error("This product is already added to another combination!");
      return;
    }
    setProducts([...products, { ...pickerCombination, productId: picked.id, productName: picked.productName }]);
    setPickerCombination(null);
  };

  const removeProductFromCombination = (combination: ProductCombination) => {
    setProducts(products.filter((product) => product !== findProductForCombination(combination)));
  };

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter matrix name");
      return;
    }
    if (attributeIds.length === 0) {
      toast.error("Please select attributes");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: values.name,
        details: values.details,
        images: images.map((url, order) => ({ url, order })),
        configs: products.map((product) => ({
          productId: product.productId,
          attributeValueMap: Object.fromEntries(
            selectedAttributes.map((attr) => [attr.id, (product[attr.name] as any)?.valueId])
          ),
        })),
      };

      if (mode === "add") {
        await createProductMatrix(payload);
        toast.success("Product matrix created successfully");
      } else {
        await updateProductMatrix(templateId!, payload);
        toast.success("Product matrix updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save product matrix");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > 3) {
      toast.error("You can upload up to 3 images");
      return;
    }
    try {
      const uploaded = await uploadAnyMultipleFiles(Array.from(files));
      setImages([...images, ...(uploaded ?? []).map((f) => f.downloadUrl)]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload images");
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size="45%">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Product Matrix" : "Edit Product Matrix"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Combine attributes into product variants" : "Update product matrix details"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Product Matrices Name" required>
                <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
              </Field>

              <Field label="Attributes" required>
                <MultiApiSelect
                  placeholder="Select attributes (max 3)"
                  value={attributeIds}
                  onChange={handleAttributesChange}
                  triggerClassName="w-full"
                  fetchPage={async (page, search) => {
                    const res = await fetchMatrixAttributesList({ page, limit: 20, ...(search ? { search } : {}) });
                    return {
                      items: (res?.data ?? []).map((a: any) => ({ id: String(a.id), name: a.name })),
                      totalPages: res?.paginationData?.totalPages ?? 1,
                    };
                  }}
                />
              </Field>

              {combinations.length > 0 && (
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium">Combinations</span>
                  {combinations.map((combination, index) => {
                    const product = findProductForCombination(combination);
                    return (
                      <div key={index} className="rounded-lg ring-1 ring-foreground/10">
                        <div className="flex items-center justify-between px-3 py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                          <span className="text-sm font-medium">
                            Combination {index + 1}
                            {product ? ` — ${product.productName}` : ""}
                          </span>
                          {product ? (
                            <Button variant="outline" size="sm" onClick={() => removeProductFromCombination(combination)}>
                              <Trash2 /> Remove Product
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => setPickerCombination(combination)}>
                              <Plus /> Add Product
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-3 py-2">
                          {selectedAttributes.map((attr) => (
                            <span
                              key={attr.id}
                              className="rounded-full bg-muted/60 px-2 py-0.5 text-xs"
                              style={
                                (combination[attr.name] as any)?.valueRepresentation
                                  ? { backgroundColor: (combination[attr.name] as any).valueRepresentation, color: "#fff" }
                                  : undefined
                              }
                            >
                              {attr.name}: {(combination[attr.name] as any)?.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Field label="Description">
                <Textarea
                  rows={4}
                  placeholder="Enter description"
                  value={values.details}
                  onChange={(e) => setValues({ ...values, details: e.target.value })}
                />
              </Field>

              <Field label="Template Images">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((url, i) => (
                      <div key={i} className="relative">
                        <SingleImageUpload imageUrl={url} onChange={() => setImages(images.filter((_, idx) => idx !== i))} />
                      </div>
                    ))}
                    {images.length < 3 && (
                      <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 text-center text-sm text-muted-foreground hover:bg-muted/30">
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          multiple
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files)}
                        />
                        Upload
                      </label>
                    )}
                  </div>
                </div>
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

      <ProductPickerDialog
        open={!!pickerCombination}
        onClose={() => setPickerCombination(null)}
        onSelect={handleProductSelect}
      />
    </Drawer>
  );
}
