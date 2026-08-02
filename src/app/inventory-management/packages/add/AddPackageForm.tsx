"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { createPackage } from "@/services/packages/create";
import { generateExternalPackageId } from "@/services/packages/generateExternalId";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { listUoms } from "@/services/uoms/listUoms";
import { fetchSuppliersList } from "@/services/suppliers/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";
import { createCategory } from "@/services/categories/create";
import { createBrand } from "@/services/brands/create";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { ApiSelect } from "@/components/ui/api-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

import SimpleFileUpload, { type UploadedDoc } from "../SimpleFileUpload";

interface UomOption {
  id: string;
  name: string;
}

interface FormState {
  supplierId: string | null;
  supplierName: string | null;
  name: string;
  expiry: Date | undefined;
  advertisedId: string;
  originalQuantity: string;
  unitCost: string;
  uomId: string | null;
  externalBatchId: string;
  manufacturerSku: string;
  categoryId: string | null;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  isSample: boolean;
}

const EMPTY_STATE: FormState = {
  supplierId: null,
  supplierName: null,
  name: "",
  expiry: undefined,
  advertisedId: "",
  originalQuantity: "",
  unitCost: "",
  uomId: null,
  externalBatchId: "",
  manufacturerSku: "",
  categoryId: null,
  categoryName: null,
  brandId: null,
  brandName: null,
  isSample: false,
};

function toDateString(date: Date | undefined): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function disablePastDates(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function AddPackageForm() {
  const router = useRouter();
  const { shopId } = useShop();

  const [values, setValues] = useState<FormState>(EMPTY_STATE);
  const [uomLists, setUomLists] = useState<UomOption[]>([]);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [generatingId, setGeneratingId] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createDialog, setCreateDialog] = useState<"category" | "brand" | null>(null);
  const [createName, setCreateName] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);
  const [brandRefreshKey, setBrandRefreshKey] = useState(0);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    listUoms()
      .then((res) => setUomLists(res?.data?.data?.uoms ?? []))
      .catch(() => setUomLists([]));
  }, []);

  const handleGenerateId = async () => {
    if (!shopId) return;
    setGeneratingId(true);
    try {
      const res = await generateExternalPackageId(shopId as string);
      const packageId = res?.data?.packageId ?? res?.data;
      if (!packageId) throw new Error("Invalid response structure");
      set("advertisedId", typeof packageId === "string" ? packageId : String(packageId));
      toast.success("Package ID generated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate Package ID");
    } finally {
      setGeneratingId(false);
    }
  };

  const fetchSupplierPage = async (page: number, search: string) => {
    const res = await fetchSuppliersList({ page, limit: 10, search } as any);
    return {
      items: (res?.data ?? []).map((s: any) => ({ id: s.id, name: s.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  };

  const fetchCategoryPage = async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 10, search } as any);
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  };

  const fetchBrandPage = async (page: number, search: string) => {
    const res = await fetchBrandsList({ page, limit: 10, search } as any);
    return {
      items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  };

  const handleCreateNew = async () => {
    if (!createName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setCreateSaving(true);
    try {
      if (createDialog === "category") {
        await createCategory({ name: createName.trim() });
        toast.success("Category created successfully");
        setCategoryRefreshKey((k) => k + 1);
      } else if (createDialog === "brand") {
        await createBrand({ name: createName.trim() });
        toast.success("Brand created successfully");
        setBrandRefreshKey((k) => k + 1);
      }
      setCreateDialog(null);
      setCreateName("");
    } catch (err: any) {
      toast.error(err?.message || err?.error || `Failed to create ${createDialog}`);
    } finally {
      setCreateSaving(false);
    }
  };

  const validate = (): string | null => {
    if (!values.name.trim()) return "Package Name is required";
    if (!values.advertisedId.trim()) return "Package ID is required";
    if (values.originalQuantity === "" || Number(values.originalQuantity) < 0)
      return "Original Quantity is required";
    if (values.unitCost === "") return "Unit Cost is required";
    if (!values.uomId) return "Quantity UoM is required";
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
      const advertisedId = values.advertisedId.trim();

      const duplicateCheck = await fetchPackagesMinimalExtended(shopId as string, {
        advertisedIds: advertisedId,
        page: 1,
        limit: 10,
        isFinished: false,
        sortByCreatedAt: -1,
      });
      const existingPackages = duplicateCheck?.data?.packages ?? [];
      if (existingPackages.length > 0) {
        toast.error("A package with this ID already exists in the system.");
        setSaving(false);
        return;
      }

      const body: Record<string, any> = {
        shopId,
        originalSupplierId: values.supplierId ?? null,
        name: values.name,
        expiry: toDateString(values.expiry),
        advertisedId,
        originalQuantity: Number(values.originalQuantity) || 0,
        unitCost: Number(values.unitCost) || 0,
        originalQuantityUomId: values.uomId,
        externalBatchId: values.externalBatchId || null,
        manufacturerSKU: values.manufacturerSku || null,
        originalCategoryName: values.categoryName ?? values.categoryId ?? null,
        originalBrandName: values.brandName ?? values.brandId ?? null,
        isSample: values.isSample,
        documentLinks: documents,
      };

      await createPackage(body);

      toast.success("Package created successfully");
      router.push("/admin/inventory/packages");
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/inventory">Inventory Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/inventory/packages">Packages</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Add Package</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/inventory/packages")}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-muted/40 p-5 ring-1 ring-foreground/10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Select Supplier">
              <ApiSelect
                placeholder="Select Supplier"
                value={values.supplierId}
                onChange={(val, option) => {
                  set("supplierId", val as string | null);
                  set("supplierName", option?.name ?? null);
                }}
                fetchPage={fetchSupplierPage}
                className="w-full"
                triggerClassName="w-full"
              />
            </Field>

            <Field label="Package Name" required>
              <Input value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Package Name" />
            </Field>

            <Field label="Expiry Date">
              <DatePicker
                value={values.expiry}
                onChange={(d) => set("expiry", d)}
                disabledDate={disablePastDates}
                placeholder="Expiry Date"
              />
            </Field>

            <Field
              label="Package ID"
              required
              tooltip="If you have your own package Id from a 3rd party vendor you may put that in here, else you should generate one from the system"
            >
              <div className="flex gap-2">
                <Input
                  value={values.advertisedId}
                  onChange={(e) => set("advertisedId", e.target.value)}
                  placeholder="Package ID"
                  className="flex-1"
                />
                <Button type="button" onClick={handleGenerateId} disabled={generatingId}>
                  {generatingId ? "Generating..." : "Generate From System"}
                </Button>
              </div>
            </Field>

            <Field label="Original Quantity" required>
              <Input
                type="number"
                min={0}
                value={values.originalQuantity}
                onChange={(e) => set("originalQuantity", e.target.value)}
                placeholder="Original Quantity"
              />
            </Field>

            <Field label="Unit Cost" required>
              <Input value={values.unitCost} onChange={(e) => set("unitCost", e.target.value)} placeholder="Unit Cost" />
            </Field>

            <Field label="Select Quantity UoM" required>
              <Select
                items={uomLists.map((u) => ({ value: u.id, label: u.name }))}
                value={values.uomId ?? undefined}
                onValueChange={(v) => set("uomId", v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Quantity UoM" />
                </SelectTrigger>
                <SelectContent>
                  {uomLists.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="External Batch ID">
              <Input
                value={values.externalBatchId}
                onChange={(e) => set("externalBatchId", e.target.value)}
                placeholder="External Batch ID"
              />
            </Field>

            <Field label="Manufacturer SKU">
              <Input
                value={values.manufacturerSku}
                onChange={(e) => set("manufacturerSku", e.target.value)}
                placeholder="Manufacturer SKU"
              />
            </Field>

            <Field label="Category">
              <div className="flex gap-2">
                <ApiSelect
                  key={categoryRefreshKey}
                  placeholder="Select Category"
                  value={values.categoryId}
                  onChange={(val, option) => {
                    set("categoryId", val as string | null);
                    set("categoryName", option?.name ?? null);
                  }}
                  fetchPage={fetchCategoryPage}
                  className="flex-1"
                  triggerClassName="w-full"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateName("");
                    setCreateDialog("category");
                  }}
                >
                  + Create new
                </Button>
              </div>
            </Field>

            <Field label="Brand">
              <div className="flex gap-2">
                <ApiSelect
                  key={brandRefreshKey}
                  placeholder="Select Brand"
                  value={values.brandId}
                  onChange={(val, option) => {
                    set("brandId", val as string | null);
                    set("brandName", option?.name ?? null);
                  }}
                  fetchPage={fetchBrandPage}
                  className="flex-1"
                  triggerClassName="w-full"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateName("");
                    setCreateDialog("brand");
                  }}
                >
                  + Create new
                </Button>
              </div>
            </Field>

            <Field label="Is Sample" tooltip="Sample packages aren't tied to inventory">
              <div className="flex h-8 items-center">
                <Switch checked={values.isSample} onCheckedChange={(v) => set("isSample", v)} />
              </div>
            </Field>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Upload Documents</label>
              <SimpleFileUpload files={documents} onChange={setDocuments} maxCount={5} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Dialog open={createDialog !== null} onOpenChange={(open) => !open && setCreateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createDialog === "category" ? "Create Category" : "Create Brand"}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={createDialog === "category" ? "Category name" : "Brand name"}
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
    </TooltipProvider>
  );
}

function Field({
  label,
  required,
  tooltip,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 flex items-center gap-1 text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger className="inline-flex text-muted-foreground">
              <span className="cursor-help text-xs">ⓘ</span>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </label>
      {children}
    </div>
  );
}
