"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { getSingleProduct } from "@/services/products/getSingleProduct";
import { createProduct } from "@/services/products/create";
import { updateProduct } from "@/services/products/update";
import { checkExistingProduct } from "@/services/products/checkExisting";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchTagsList } from "@/services/tags/list";
import { fetchStrainsList } from "@/services/strains/list";
import { createBrand } from "@/services/brands/create";
import { createCategory } from "@/services/categories/create";
import { createTag } from "@/services/tags/create";
import { createStrain } from "@/services/strains/create";
import { listUoms } from "@/services/uoms/listUoms";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import ProductFormFields, {
  EMPTY_PRODUCT_VALUES,
  EMPTY_RANGE,
  type ProductFormValues,
  type RangeField,
  type UomOption,
  type UploadedImage,
} from "./ProductFormFields";
import type { ProductRow } from "./types";

interface AddEditProductDrawerProps {
  open: boolean;
  onClose: () => void;
  product?: ProductRow | null;
  onDone: (created?: { id: string; name: string }) => void;
}

function selectableId(item: any): string {
  return typeof item === "string" ? item : item?.id ?? String(item);
}

export default function AddEditProductDrawer({ open, onClose, product = null, onDone }: AddEditProductDrawerProps) {
  const isEdit = !!product;

  const [values, setValues] = useState<ProductFormValues>(EMPTY_PRODUCT_VALUES);
  const [strainIds, setStrainIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [videoLinks, setVideoLinks] = useState<string[]>([""]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [thc, setThc] = useState<RangeField>(EMPTY_RANGE);
  const [cbd, setCbd] = useState<RangeField>(EMPTY_RANGE);
  const [effects, setEffects] = useState<string[]>([]);
  const [terpenes, setTerpenes] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [uomLists, setUomLists] = useState<UomOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [foundProducts, setFoundProducts] = useState<any[]>([]);
  const [overridingId, setOverridingId] = useState<string | null>(null);

  const [createDialog, setCreateDialog] = useState<"category" | "brand" | "strain" | "tag" | null>(null);
  const [createName, setCreateName] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState({ category: 0, brand: 0, strain: 0, tag: 0 });

  const set = <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (!open) return;
    if (isEdit && !product) return;

    setValues(EMPTY_PRODUCT_VALUES);
    setStrainIds([]);
    setTagIds([]);
    setVideoLinks([""]);
    setImages([]);
    setThc(EMPTY_RANGE);
    setCbd(EMPTY_RANGE);
    setEffects([]);
    setTerpenes([{ key: "", value: "" }]);
    setFoundProducts([]);
    setOverridingId(null);

    listUoms()
      .then((res) => setUomLists(res?.data?.data?.uoms ?? []))
      .catch(() => setUomLists([]));

    if (!product) return;

    setLoading(true);
    getSingleProduct(product.id)
      .then((res: any) => {
        const p = res?.data?.data?.product ?? res?.data?.product;
        if (!p) throw new Error("Product not found");

        setValues({
          name: p.name || "",
          categoryId: p.category?.id ?? null,
          categoryName: p.category?.name ?? null,
          brandId: p.brand?.id ?? null,
          brandName: p.brand?.name ?? null,
          productProfile: p.productProfile === "REGULAR" ? "REGULAR" : "CANNABIS",
          unitWeight: p.unitWeight != null ? String(p.unitWeight) : "",
          unitWeightUomId: p.unitWeightUom?.id ?? null,
          packagedUnitWeight: p.packagedUnitWeight != null ? String(p.packagedUnitWeight) : "",
          packagedUnitWeightUomId: p.packagedUnitWeightUom?.id ?? null,
          ean: p.ean || "",
          sku: p.sku || "",
          details: p.details || "",
          cannabisType: p.cannabisProductData?.cannabisType || "",
          otherCannabisType: p.cannabisProductData?.otherCannabisType || "",
        });

        setStrainIds((p.strains || []).map(selectableId));
        setTagIds((p.tags || []).map(selectableId));
        setImages((p.images || []).map((img: any) => ({ url: img.url })));
        setVideoLinks(p.videoLinks?.length ? p.videoLinks : [""]);
        setEffects(p.cannabisProductData?.effects || []);

        const thcData = p.cannabisProductData?.thcData;
        if (thcData) {
          setThc({
            value: thcData.value != null ? String(thcData.value) : "",
            unit: thcData.unit || "%",
            description: thcData.description || "",
            isRangeApplicable: !!thcData.isRangeApplicable,
            min: thcData.minimum != null ? String(thcData.minimum) : "",
            max: thcData.maximum != null ? String(thcData.maximum) : "",
          });
        }
        const cbdData = p.cannabisProductData?.cbdData;
        if (cbdData) {
          setCbd({
            value: cbdData.value != null ? String(cbdData.value) : "",
            unit: cbdData.unit || "%",
            description: cbdData.description || "",
            isRangeApplicable: !!cbdData.isRangeApplicable,
            min: cbdData.minimum != null ? String(cbdData.minimum) : "",
            max: cbdData.maximum != null ? String(cbdData.maximum) : "",
          });
        }
        const terpeneProfiles = p.cannabisProductData?.terpeneProfiles;
        if (terpeneProfiles && Object.keys(terpeneProfiles).length > 0) {
          setTerpenes(Object.entries(terpeneProfiles).map(([key, value]) => ({ key, value: String(value) })));
        }
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load product details"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

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

  const handleCreateNew = async () => {
    if (!createName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setCreateSaving(true);
    try {
      if (createDialog === "category") await createCategory({ name: createName.trim() });
      else if (createDialog === "brand") await createBrand({ name: createName.trim() });
      else if (createDialog === "strain") await createStrain({ name: createName.trim() });
      else if (createDialog === "tag") await createTag({ name: createName.trim() });
      toast.success(`${createDialog} created successfully`);
      setRefreshKeys((prev) => ({ ...prev, [createDialog as string]: prev[createDialog as keyof typeof prev] + 1 }));
      setCreateDialog(null);
      setCreateName("");
    } catch (err: any) {
      toast.error(err?.message || err?.error || `Failed to create ${createDialog}`);
    } finally {
      setCreateSaving(false);
    }
  };

  const addVideoLink = () => setVideoLinks((prev) => [...prev, ""]);
  const changeVideoLink = (i: number, val: string) =>
    setVideoLinks((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  const removeVideoLink = (i: number) => setVideoLinks((prev) => prev.filter((_, idx) => idx !== i));

  const addTerpene = () => setTerpenes((prev) => [...prev, { key: "", value: "" }]);
  const changeTerpene = (i: number, field: "key" | "value", val: string) =>
    setTerpenes((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
  const removeTerpene = (i: number) => setTerpenes((prev) => prev.filter((_, idx) => idx !== i));

  const buildBody = () => {
    const body: Record<string, any> = {
      name: values.name.trim(),
      details: values.details || undefined,
      categoryId: values.categoryId,
      brandId: values.brandId,
      images: images.map((img, i) => ({ url: img.url, order: i })),
      unitWeight: values.unitWeight === "" ? 0 : Number(values.unitWeight),
      unitWeightUomId: values.unitWeightUomId,
      packagedUnitWeight: values.packagedUnitWeight === "" ? 0 : Number(values.packagedUnitWeight),
      packagedUnitWeightUomId: values.packagedUnitWeightUomId,
      ean: values.ean || undefined,
      sku: values.sku || undefined,
      productProfile: values.productProfile,
      tagIds,
      strainIds,
      videoLinks: videoLinks.filter((v) => v && v.trim() !== ""),
    };

    if (values.productProfile !== "REGULAR") {
      body.cannabisProductData = {
        thcData: {
          value: thc.value || null,
          unit: thc.unit,
          description: thc.description || null,
          isRangeApplicable: thc.isRangeApplicable,
          minimum: thc.isRangeApplicable ? thc.min || null : null,
          maximum: thc.isRangeApplicable ? thc.max || null : null,
        },
        cbdData: {
          value: cbd.value || null,
          unit: cbd.unit,
          description: cbd.description || null,
          isRangeApplicable: cbd.isRangeApplicable,
          minimum: cbd.isRangeApplicable ? cbd.min || null : null,
          maximum: cbd.isRangeApplicable ? cbd.max || null : null,
        },
        cannabisType: values.cannabisType || null,
        otherCannabisType: values.cannabisType === "Other" ? values.otherCannabisType : null,
        effects,
        terpeneProfiles: terpenes.reduce((acc: Record<string, number>, pair) => {
          const num = parseFloat(pair.value);
          if (pair.key && Number.isFinite(num)) acc[pair.key] = num;
          return acc;
        }, {}),
        tagIds,
        strainIds,
      };
    }

    return body;
  };

  const validate = (): string | null => {
    if (!values.name.trim()) return "Product name is required";
    if (values.productProfile === "CANNABIS" && values.cannabisType === "Other" && !values.otherCannabisType.trim())
      return "Please specify the cannabis type";
    if (thc.isRangeApplicable && (!thc.min || !thc.max)) return "THC min/max are required when range is enabled";
    if (cbd.isRangeApplicable && (!cbd.min || !cbd.max)) return "CBD min/max are required when range is enabled";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const body = buildBody();

      if (isEdit && product) {
        await updateProduct(product.id, body);
        toast.success("Product updated successfully");
        onDone();
        return;
      }

      if (values.ean || values.sku) {
        const dupRes = await checkExistingProduct({ ean: values.ean || undefined, sku: values.sku || undefined });
        const found = (dupRes as any)?.data?.data?.foundProducts ?? [];
        if (found.length > 0) {
          setFoundProducts(found);
          setSaving(false);
          return;
        }
      }

      const res: any = await createProduct(body);
      const createdId = res?.data?.data?.id;
      toast.success("Product created successfully");
      onDone(createdId ? { id: createdId, name: values.name } : undefined);
    } catch (err: any) {
      toast.error(err?.message || err?.error || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = async (productId: string) => {
    setOverridingId(productId);
    try {
      const body = buildBody();
      await updateProduct(productId, body);
      toast.success("Product updated successfully");
      onDone();
    } catch (err: any) {
      toast.error(err?.message || err?.error || "An unexpected error occurred");
    } finally {
      setOverridingId(null);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size="80%">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <span className="text-base font-semibold">
            {isEdit ? `Edit Product${product?.name ? `: ${product.name}` : ""}` : "Add New Product"}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : foundProducts.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-3 text-sm text-muted-foreground">
              A product with this SKU/EAN already exists. Override it, or go back and change the values.
            </p>
            <div className="flex flex-col gap-3">
              {foundProducts.map((data) => (
                <div key={data?.product?.id} className="rounded-xl p-4 ring-1 ring-foreground/10">
                  <div className="mb-2 text-xs text-muted-foreground">
                    {data?.conflictMessages?.[0] || ""}
                    {data?.conflictMessages?.[1] ? ` · ${data.conflictMessages[1]}` : ""}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {data?.product?.name || "N/A"}</div>
                    <div><span className="text-muted-foreground">Brand:</span> {data?.product?.brand?.name || data?.product?.brand || "N/A"}</div>
                    <div><span className="text-muted-foreground">Category:</span> {data?.product?.category?.name || data?.product?.category || "N/A"}</div>
                    <div><span className="text-muted-foreground">SKU:</span> {data?.product?.sku || "N/A"}</div>
                    <div><span className="text-muted-foreground">EAN:</span> {data?.product?.ean || "N/A"}</div>
                  </div>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => handleOverride(data?.product?.id)}
                    disabled={overridingId === data?.product?.id}
                  >
                    {overridingId === data?.product?.id ? "Overriding..." : "Override"}
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4" onClick={() => setFoundProducts([])}>
              Back to form
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <ProductFormFields
                values={values}
                set={set}
                strainIds={strainIds}
                setStrainIds={setStrainIds}
                tagIds={tagIds}
                setTagIds={setTagIds}
                videoLinks={videoLinks}
                addVideoLink={addVideoLink}
                changeVideoLink={changeVideoLink}
                removeVideoLink={removeVideoLink}
                images={images}
                setImages={setImages}
                thc={thc}
                setThc={setThc}
                cbd={cbd}
                setCbd={setCbd}
                effects={effects}
                setEffects={setEffects}
                terpenes={terpenes}
                addTerpene={addTerpene}
                changeTerpene={changeTerpene}
                removeTerpene={removeTerpene}
                uomLists={uomLists}
                refreshKeys={refreshKeys}
                openCreateDialog={(type) => { setCreateName(""); setCreateDialog(type); }}
                fetchCategoryPage={fetchCategoryPage}
                fetchBrandPage={fetchBrandPage}
                fetchStrainPage={fetchStrainPage}
                fetchTagPage={fetchTagPage}
              />
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={createDialog !== null} onOpenChange={(open) => !open && setCreateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {createDialog}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={`${createDialog ?? ""} name`}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateNew();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(null)} disabled={createSaving}>
              Cancel
            </Button>
            <Button onClick={handleCreateNew} disabled={createSaving}>
              {createSaving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
