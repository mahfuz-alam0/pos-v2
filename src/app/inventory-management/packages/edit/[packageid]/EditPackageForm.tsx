"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, QrCode } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { updatePackage, updateCannabisPackage } from "@/services/packages/update";
import { pullPackageCoa } from "@/services/packages/pullCoa";
import { listUoms } from "@/services/uoms/listUoms";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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

import SimpleFileUpload, { type UploadedDoc } from "../../SimpleFileUpload";
import type { AdditionalCannabisProps, PackageDetail } from "../../types";

interface UomOption {
  id: string;
  name: string;
  shortForm?: string;
}

const ADDITIONAL_PROPERTIES: { key: "cbcContent" | "cbnContent" | "cbdvContent" | "cbgContent" | "thcvContent" | "cbgaContent"; label: string }[] = [
  { key: "cbcContent", label: "Total CBC" },
  { key: "cbnContent", label: "Total CBN" },
  { key: "cbdvContent", label: "Total CBDV" },
  { key: "cbgContent", label: "Total CBG" },
  { key: "thcvContent", label: "Total THCV" },
  { key: "cbgaContent", label: "Total CBGA" },
];

const TERPENE_PROPERTIES: { key: "myrcene" | "alphaPinene" | "betaPinene" | "alphaBisabolol" | "terpinolene" | "limonene" | "humulene" | "caryophyllene" | "linalool"; label: string }[] = [
  { key: "myrcene", label: "Myrcene" },
  { key: "alphaPinene", label: "Alpha-Pinene" },
  { key: "betaPinene", label: "Beta-Pinene" },
  { key: "alphaBisabolol", label: "Alpha-Bisabolol" },
  { key: "terpinolene", label: "Terpinolene" },
  { key: "limonene", label: "Limonene" },
  { key: "humulene", label: "Humulene" },
  { key: "caryophyllene", label: "Caryophyllene" },
  { key: "linalool", label: "Linalool" },
];

interface FormState {
  name: string;
  supplierId: string | null;
  supplierName: string | null;
  expiry: Date | undefined;
  advertisedId: string;
  originalQuantity: string;
  unitCost: string;
  discountPercent: string;
  uomId: string | null;
  externalBatchId: string;
  manufacturerSku: string;
  categoryId: string | null;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  isSample: boolean;

  testUom: "PERCENTAGE" | "MILLIGRAM";
  thcContent: string;
  cbdContent: string;
  thcaContent: string;
  cbdaContent: string;
  thcTestRangeMin: string;
  thcTestRangeMax: string;
  totalPotentialPsychoactiveThc: string;
  cbcContent: string;
  cbnContent: string;
  cbdvContent: string;
  cbgContent: string;
  thcvContent: string;
  cbgaContent: string;

  testLab: string;
  testLicense: string;
  testCompletedDate: Date | undefined;
  totalTerpenes: string;
  myrcene: string;
  alphaPinene: string;
  betaPinene: string;
  alphaBisabolol: string;
  terpinolene: string;
  limonene: string;
  humulene: string;
  caryophyllene: string;
  linalool: string;

  manufacturedDate: Date | undefined;
  harvestedDate: Date | undefined;
  sellByDate: Date | undefined;
  useByDate: Date | undefined;
  packagedNetWeightInGrams: string;
}

const EMPTY_STATE: FormState = {
  name: "",
  supplierId: null,
  supplierName: null,
  expiry: undefined,
  advertisedId: "",
  originalQuantity: "",
  unitCost: "",
  discountPercent: "",
  uomId: null,
  externalBatchId: "",
  manufacturerSku: "",
  categoryId: null,
  categoryName: null,
  brandId: null,
  brandName: null,
  isSample: false,

  testUom: "PERCENTAGE",
  thcContent: "",
  cbdContent: "",
  thcaContent: "",
  cbdaContent: "",
  thcTestRangeMin: "",
  thcTestRangeMax: "",
  totalPotentialPsychoactiveThc: "",
  cbcContent: "",
  cbnContent: "",
  cbdvContent: "",
  cbgContent: "",
  thcvContent: "",
  cbgaContent: "",

  testLab: "",
  testLicense: "",
  testCompletedDate: undefined,
  totalTerpenes: "",
  myrcene: "",
  alphaPinene: "",
  betaPinene: "",
  alphaBisabolol: "",
  terpinolene: "",
  limonene: "",
  humulene: "",
  caryophyllene: "",
  linalool: "",

  manufacturedDate: undefined,
  harvestedDate: undefined,
  sellByDate: undefined,
  useByDate: undefined,
  packagedNetWeightInGrams: "",
};

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toDateString(date: Date | undefined): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function numOrNull(value: string): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function disablePastDates(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function EditPackageForm({
  packageId,
  open,
  onClose,
  onSaved,
}: {
  packageId: string | null;
  /** Pass this (even `false`) to render as a slide-in Drawer instead of a full page. */
  open?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { shopId } = useShop();
  const metrcMechanism = useFeatureAccess();
  const isDrawerMode = open !== undefined;
  const closeOrNavigate = () => {
    if (onClose) onClose();
    else router.push("/inventory-management/packages");
  };

  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pullCoaLoading, setPullCoaLoading] = useState(false);
  const [values, setValues] = useState<FormState>(EMPTY_STATE);
  const [uomLists, setUomLists] = useState<UomOption[]>([]);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [coaDocuments, setCoaDocuments] = useState<UploadedDoc[]>([]);
  const [qrCodeDocuments, setQrCodeDocuments] = useState<UploadedDoc[]>([]);
  const [showAdditionalProperties, setShowAdditionalProperties] = useState(false);
  const [showTerpenes, setShowTerpenes] = useState(false);

  const isMetrc = Boolean(packageDetail?.metrcData);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    listUoms()
      .then((res) => setUomLists(res?.data?.data?.uoms ?? []))
      .catch(() => setUomLists([]));
  }, []);

  useEffect(() => {
    if (!shopId || !packageId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchSinglePackage(shopId as string, { id: packageId });
        const pkg: PackageDetail | undefined = res?.data?.data?.package ?? res?.data?.data;
        if (!pkg) {
          toast.error("Package not found");
          return;
        }
        setPackageDetail(pkg);

        const props = pkg.additionalCannabisProps || {};

        setValues({
          name: pkg.name ?? "",
          supplierId: pkg.supplierId ?? null,
          supplierName: pkg.supplierName ?? null,
          expiry: toDate(pkg.expiry),
          advertisedId: pkg.advertisedId ?? "",
          originalQuantity: pkg.originalQuantity != null ? String(pkg.originalQuantity) : "",
          unitCost: pkg.unitCost != null ? String(pkg.unitCost) : "",
          discountPercent: pkg.discountPercent != null ? String(pkg.discountPercent) : "0",
          uomId: pkg.uomId ?? null,
          externalBatchId: pkg.externalBatchId ?? "",
          manufacturerSku: pkg.manufacturerSku ?? "",
          categoryId: pkg.category?.id ?? null,
          categoryName: pkg.category?.name ?? null,
          brandId: pkg.brand?.id ?? null,
          brandName: pkg.brand?.name ?? null,
          isSample: Boolean(pkg.isSample),

          testUom: props.testUom ?? "PERCENTAGE",
          thcContent: props.thcContent != null ? String(props.thcContent) : "",
          cbdContent: props.cbdContent != null ? String(props.cbdContent) : "",
          thcaContent: props.thcaContent != null ? String(props.thcaContent) : "",
          cbdaContent: props.cbdaContent != null ? String(props.cbdaContent) : "",
          thcTestRangeMin: props.thcTestRangeMin != null ? String(props.thcTestRangeMin) : "",
          thcTestRangeMax: props.thcTestRangeMax != null ? String(props.thcTestRangeMax) : "",
          totalPotentialPsychoactiveThc:
            props.totalPotentialPsychoactiveThc != null ? String(props.totalPotentialPsychoactiveThc) : "",
          cbcContent: props.cbcContent != null ? String(props.cbcContent) : "",
          cbnContent: props.cbnContent != null ? String(props.cbnContent) : "",
          cbdvContent: props.cbdvContent != null ? String(props.cbdvContent) : "",
          cbgContent: props.cbgContent != null ? String(props.cbgContent) : "",
          thcvContent: props.thcvContent != null ? String(props.thcvContent) : "",
          cbgaContent: props.cbgaContent != null ? String(props.cbgaContent) : "",

          testLab: props.testLab ?? "",
          testLicense: props.testLicense ?? "",
          testCompletedDate: toDate(props.testCompletedDate),
          totalTerpenes: "",
          myrcene: props.myrcene != null ? String(props.myrcene) : "",
          alphaPinene: props.alphaPinene != null ? String(props.alphaPinene) : "",
          betaPinene: props.betaPinene != null ? String(props.betaPinene) : "",
          alphaBisabolol: props.alphaBisabolol != null ? String(props.alphaBisabolol) : "",
          terpinolene: props.terpinolene != null ? String(props.terpinolene) : "",
          limonene: props.limonene != null ? String(props.limonene) : "",
          humulene: props.humulene != null ? String(props.humulene) : "",
          caryophyllene: props.caryophyllene != null ? String(props.caryophyllene) : "",
          linalool: props.linalool != null ? String(props.linalool) : "",

          manufacturedDate: toDate(props.manufacturedDate),
          harvestedDate: toDate(props.harvestedDate),
          sellByDate: toDate(props.sellByDate),
          useByDate: toDate(props.useByDate),
          packagedNetWeightInGrams:
            props.packagedNetWeightInGrams != null ? String(props.packagedNetWeightInGrams) : "",
        });

        setDocuments((pkg.documentLinks ?? []).map((d) => ({ url: d.url, name: d.name })));
        setCoaDocuments((props.coaDocuments ?? []).map((d) => ({ url: d.url, name: d.name })));
        setQrCodeDocuments((props.testQrCodeDocuments ?? []).map((d) => ({ url: d.url, name: d.name })));

        const hasAdditional = ADDITIONAL_PROPERTIES.some((p) => props[p.key] != null && props[p.key] !== ("" as any));
        setShowAdditionalProperties(hasAdditional);

        const hasTerpenes = TERPENE_PROPERTIES.some((p) => props[p.key] != null && props[p.key] !== ("" as any));
        setShowTerpenes(hasTerpenes);
      } catch (err: any) {
        toast.error(err?.message || "Failed to fetch package details");
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId, packageId]);

  const effectiveUnitCostDisplay = useMemo(() => {
    const unitCost = parseFloat(values.unitCost);
    const discountPercent = parseFloat(values.discountPercent);
    if (!Number.isFinite(unitCost)) return null;
    if (!Number.isFinite(discountPercent) || discountPercent <= 0) return null;
    return (unitCost * (1 - discountPercent / 100)).toFixed(2);
  }, [values.unitCost, values.discountPercent]);

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
      const additionalCannabisProps: AdditionalCannabisProps = {
        thcContent: numOrNull(values.thcContent) ?? undefined,
        cbdContent: numOrNull(values.cbdContent) ?? undefined,
        thcaContent: numOrNull(values.thcaContent) ?? undefined,
        cbdaContent: numOrNull(values.cbdaContent) ?? undefined,
        cbcContent: numOrNull(values.cbcContent) ?? undefined,
        cbnContent: numOrNull(values.cbnContent) ?? undefined,
        cbdvContent: numOrNull(values.cbdvContent) ?? undefined,
        cbgContent: numOrNull(values.cbgContent) ?? undefined,
        thcvContent: numOrNull(values.thcvContent) ?? undefined,
        cbgaContent: numOrNull(values.cbgaContent) ?? undefined,
        testUom: values.testUom,
        thcTestRangeMin: numOrNull(values.thcTestRangeMin) ?? undefined,
        thcTestRangeMax: numOrNull(values.thcTestRangeMax) ?? undefined,
        totalPotentialPsychoactiveThc: numOrNull(values.totalPotentialPsychoactiveThc) ?? undefined,
        myrcene: numOrNull(values.myrcene) ?? undefined,
        alphaPinene: numOrNull(values.alphaPinene) ?? undefined,
        betaPinene: numOrNull(values.betaPinene) ?? undefined,
        alphaBisabolol: numOrNull(values.alphaBisabolol) ?? undefined,
        terpinolene: numOrNull(values.terpinolene) ?? undefined,
        limonene: numOrNull(values.limonene) ?? undefined,
        humulene: numOrNull(values.humulene) ?? undefined,
        caryophyllene: numOrNull(values.caryophyllene) ?? undefined,
        linalool: numOrNull(values.linalool) ?? undefined,
        testLab: values.testLab || undefined,
        testLicense: values.testLicense || undefined,
        testCompletedDate: toDateString(values.testCompletedDate) ?? undefined,
        manufacturedDate: toDateString(values.manufacturedDate) ?? undefined,
        harvestedDate: toDateString(values.harvestedDate) ?? undefined,
        sellByDate: toDateString(values.sellByDate) ?? undefined,
        useByDate: toDateString(values.useByDate) ?? undefined,
        packagedNetWeightInGrams: numOrNull(values.packagedNetWeightInGrams) ?? undefined,
        coaDocuments: coaDocuments.length > 0 ? coaDocuments : undefined,
        testQrCodeDocuments: qrCodeDocuments.length > 0 ? qrCodeDocuments : undefined,
      };

      const body: Record<string, any> = {
        id: packageId,
        shopId,
        name: values.name,
        isSample: values.isSample,
        documentLinks: documents,
        advertisedId: values.advertisedId,
        expiry: toDateString(values.expiry),
        originalQuantity: Number(values.originalQuantity) || 0,
        unitCost: Number(values.unitCost) || 0,
        discountPercent: Number(values.discountPercent) || 0,
        originalQuantityUomId: values.uomId,
        originalBrandName: values.brandName ?? values.brandId ?? null,
        originalCategoryName: values.categoryName ?? values.categoryId ?? null,
        originalSupplierId: values.supplierId ?? null,
        externalBatchId: values.externalBatchId || null,
        manufacturerSKU: values.manufacturerSku || null,
        additionalCannabisProps,
        testLicense: values.testLicense || null,
      };

      await (isMetrc ? updateCannabisPackage(body) : updatePackage(body));

      toast.success("Package updated successfully");
      if (onSaved) onSaved();
      else router.push("/inventory-management/packages");
    } catch (err: any) {
      const validationErrors = err?.childValidationErrors || err?.validationErrors || err?.error?.data?.errors || err?.data?.data?.errors;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        validationErrors.forEach((v: any) => {
          const field = v.parent ? `${v.parent}.${v.field ?? v.property}` : v.field ?? v.property;
          const message = v.message || Object.values(v.constraints || {}).join(", ");
          toast.error(`${field}: ${message}`);
        });
      } else if (typeof err?.error === "string") {
        toast.error(err.error);
      } else {
        toast.error(err?.message || "Failed to update package");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePullCoa = async () => {
    if (!packageId || !shopId) return;
    setPullCoaLoading(true);
    try {
      await pullPackageCoa(packageId, shopId as string);
      toast.success("COA pulled from Metrc successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to pull COA");
    } finally {
      setPullCoaLoading(false);
    }
  };

  const thcCbdUnit = values.testUom === "PERCENTAGE" ? "%" : "mg";

  const skeleton = (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );

  if (loading) {
    return isDrawerMode ? (
      <Drawer open={!!open} onClose={onClose} side="right" size="76vw">
        {skeleton}
      </Drawer>
    ) : (
      skeleton
    );
  }

  const headerBar = isDrawerMode ? (
    <div className="flex items-center justify-between border-b border-border p-5 pb-4">
      <h2 className="text-base font-semibold text-foreground/70">Edit Package</h2>
      <div className="flex gap-2 [&_button]:h-9! [&_button]:px-5! [&_button]:text-[14px]!">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {isMetrc && !!metrcMechanism && (
          <Button variant="outline" onClick={handlePullCoa} disabled={pullCoaLoading}>
            <FileText className="size-3.5" />
            {pullCoaLoading ? "Pulling..." : "Pull COA"}
          </Button>
        )}
        <Button variant="outline" onClick={closeOrNavigate}>
          Close
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/inventory-management/packages">Packages</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit Package</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/inventory-management/packages")}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
  );

  const formBody = (
    <>
        {/* Basic Package Information */}
        <div className="rounded-xl bg-muted/40 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground/70">Basic Package Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isMetrc ? (
              <>
                <Field label="Package Name" required>
                  <Input value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Package Name" />
                </Field>
                <Field label="Unit Cost" required>
                  <Input value={values.unitCost} onChange={(e) => set("unitCost", e.target.value)} placeholder="Unit Cost" />
                </Field>
                <Field label="Discount %">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={values.discountPercent}
                    onChange={(e) => set("discountPercent", e.target.value)}
                    placeholder="e.g. 10"
                  />
                  {effectiveUnitCostDisplay && (
                    <div className="mt-1 text-xs text-green-700 dark:text-green-500">
                      Effective Unit Cost: ${effectiveUnitCostDisplay}
                    </div>
                  )}
                </Field>
                <Field label="Manufacturer">
                  <ApiSelect
                    placeholder="Select Brand"
                    value={values.brandId}
                    onChange={(val, option) => {
                      set("brandId", val as string | null);
                      set("brandName", option?.name ?? null);
                    }}
                    fetchPage={fetchBrandPage}
                    className="w-full"
                    triggerClassName="w-full"
                  />
                </Field>
                <Field label="Manufacturer SKU">
                  <Input
                    value={values.manufacturerSku}
                    onChange={(e) => set("manufacturerSku", e.target.value)}
                    placeholder="Manufacturer SKU"
                  />
                </Field>

                <Field label="Select Supplier">
                  <Input value={values.supplierName ?? ""} disabled placeholder="Supplier" />
                </Field>
                <Field label="Expiry Date">
                  <DatePicker value={values.expiry} onChange={() => {}} disabled placeholder="Expiry Date" />
                </Field>
                <Field label="Package ID" required>
                  <Input value={values.advertisedId} disabled placeholder="Package ID" />
                </Field>
                <Field label="Original Quantity" required>
                  <Input value={values.originalQuantity} disabled placeholder="Original Quantity" />
                </Field>
                <Field label="Select Quantity UoM" required>
                  <Select
                    items={uomLists.map((u) => ({ value: u.id, label: u.name }))}
                    value={values.uomId ?? undefined}
                    disabled
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
                <Field label="Category">
                  <Input value={values.categoryName ?? ""} disabled placeholder="Category" />
                </Field>
                <Field label="Is Sample">
                  <div className="flex h-8 items-center">
                    <Switch checked={values.isSample} disabled />
                  </div>
                </Field>
              </>
            ) : (
              <>
                <Field label="Select Supplier">
                  <ApiSelect
                    placeholder="Select Supplier"
                    value={values.supplierId}
                    onChange={(val, option) => {
                      set("supplierId", val as string | null);
                      set("supplierName", option?.name ?? null);
                    }}
                    fetchPage={async (page, search) => {
                      const res = await import("@/services/suppliers/list").then((m) =>
                        m.fetchSuppliersList({ page, limit: 10, search } as any)
                      );
                      return {
                        items: (res?.data ?? []).map((s: any) => ({ id: s.id, name: s.name })),
                        totalPages: res?.paginationData?.totalPages ?? 1,
                      };
                    }}
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
                  <Input
                    value={values.advertisedId}
                    onChange={(e) => set("advertisedId", e.target.value)}
                    placeholder="Package ID"
                  />
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
                <Field label="Discount %">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={values.discountPercent}
                    onChange={(e) => set("discountPercent", e.target.value)}
                    placeholder="e.g. 10"
                  />
                  {effectiveUnitCostDisplay && (
                    <div className="mt-1 text-xs text-green-700 dark:text-green-500">
                      Effective Unit Cost: ${effectiveUnitCostDisplay}
                    </div>
                  )}
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
                  <ApiSelect
                    placeholder="Select Category"
                    value={values.categoryId}
                    onChange={(val, option) => {
                      set("categoryId", val as string | null);
                      set("categoryName", option?.name ?? null);
                    }}
                    fetchPage={fetchCategoryPage}
                    className="w-full"
                    triggerClassName="w-full"
                  />
                </Field>
                <Field label="Manufacturer">
                  <ApiSelect
                    placeholder="Select Brand"
                    value={values.brandId}
                    onChange={(val, option) => {
                      set("brandId", val as string | null);
                      set("brandName", option?.name ?? null);
                    }}
                    fetchPage={fetchBrandPage}
                    className="w-full"
                    triggerClassName="w-full"
                  />
                </Field>
                <Field label="Is Sample" tooltip="If it's a sample package, it will not be associated with any inventory">
                  <div className="flex h-8 items-center">
                    <Switch checked={values.isSample} onCheckedChange={(v) => set("isSample", v)} />
                  </div>
                </Field>
              </>
            )}

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Upload Documents</label>
              <SimpleFileUpload files={documents} onChange={setDocuments} maxCount={5} />
            </div>
          </div>
        </div>

        {/* THC/CBD Analysis */}
        <div className="rounded-xl bg-muted/40 p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold">THC/CBD Analysis</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="THC/CBD UoM">
              <Select
                items={[
                  { value: "PERCENTAGE", label: "Percentage (%)" },
                  { value: "MILLIGRAM", label: "Milligram (mg)" },
                ]}
                value={values.testUom}
                onValueChange={(v) => set("testUom", v as "PERCENTAGE" | "MILLIGRAM")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select THC/CBD Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="MILLIGRAM">Milligram (mg)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`THC (${thcCbdUnit})`}>
              <Input value={values.thcContent} onChange={(e) => set("thcContent", e.target.value)} placeholder={`Enter THC in ${thcCbdUnit}`} />
            </Field>
            <Field label={`CBD (${thcCbdUnit})`}>
              <Input value={values.cbdContent} onChange={(e) => set("cbdContent", e.target.value)} placeholder={`Enter CBD in ${thcCbdUnit}`} />
            </Field>
            <Field label={`THCA (${thcCbdUnit})`}>
              <Input value={values.thcaContent} onChange={(e) => set("thcaContent", e.target.value)} placeholder={`Enter THCA in ${thcCbdUnit}`} />
            </Field>
            <Field label={`CBDA (${thcCbdUnit})`}>
              <Input value={values.cbdaContent} onChange={(e) => set("cbdaContent", e.target.value)} placeholder={`Enter CBDA in ${thcCbdUnit}`} />
            </Field>
            <Field label="THC and CBD Test Range (Min)">
              <Input value={values.thcTestRangeMin} onChange={(e) => set("thcTestRangeMin", e.target.value)} placeholder="Enter Min Range" />
            </Field>
            <Field label="THC and CBD Test Range (Max)">
              <Input value={values.thcTestRangeMax} onChange={(e) => set("thcTestRangeMax", e.target.value)} placeholder="Enter Max Range" />
            </Field>
            <Field label="Total Potential Psychoactive THC %">
              <Input
                value={values.totalPotentialPsychoactiveThc}
                onChange={(e) => set("totalPotentialPsychoactiveThc", e.target.value)}
                placeholder="Enter Total Potential Psychoactive THC %"
              />
            </Field>

            {showAdditionalProperties &&
              ADDITIONAL_PROPERTIES.map((prop) => (
                <Field key={prop.key} label={`${prop.label} (${thcCbdUnit})`}>
                  <Input
                    value={values[prop.key] as string}
                    onChange={(e) => set(prop.key, e.target.value as any)}
                    placeholder={`Enter ${prop.label} in ${thcCbdUnit}`}
                  />
                </Field>
              ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdditionalProperties((v) => !v)}
            >
              {showAdditionalProperties ? "Remove Additional Properties" : "Add Additional Properties"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Test Information */}
          <div className="rounded-xl bg-muted/40 p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold">Test Information</h3>
            <div className="flex flex-col gap-4">
              <Field label="Test Facility">
                <Input value={values.testLab} onChange={(e) => set("testLab", e.target.value)} placeholder="Enter Test Lab Name" />
              </Field>
              <Field label="Test License">
                <Input value={values.testLicense} onChange={(e) => set("testLicense", e.target.value)} placeholder="Enter Test License" />
              </Field>
              <Field label="Test Completed (Date)">
                <DatePicker value={values.testCompletedDate} onChange={(d) => set("testCompletedDate", d)} placeholder="Select Test Completion Date" />
              </Field>

              {showTerpenes &&
                TERPENE_PROPERTIES.map((prop) => (
                  <Field key={prop.key} label={`${prop.label} (%)`}>
                    <Input
                      value={values[prop.key] as string}
                      onChange={(e) => set(prop.key, e.target.value as any)}
                      placeholder={`Enter ${prop.label} %`}
                    />
                  </Field>
                ))}

              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTerpenes((v) => !v)}>
                  {showTerpenes ? "Remove Terpene Breakdown" : "Add Terpene Breakdown"}
                </Button>
              </div>
            </div>
          </div>

          {/* Other Package Information */}
          <div className="rounded-xl bg-muted/40 p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold">Other Package Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Manufactured Date">
                <DatePicker value={values.manufacturedDate} onChange={(d) => set("manufacturedDate", d)} placeholder="Select Manufactured Date" />
              </Field>
              <Field label="Harvested (Date)">
                <DatePicker value={values.harvestedDate} onChange={(d) => set("harvestedDate", d)} placeholder="Select Harvest Date" />
              </Field>
              <Field label="Sell By" className="sm:col-span-2">
                <DatePicker value={values.sellByDate} onChange={(d) => set("sellByDate", d)} placeholder="Select Sell By Date" />
              </Field>
              <Field label="Use By (Date)" className="sm:col-span-2">
                <DatePicker value={values.useByDate} onChange={(d) => set("useByDate", d)} placeholder="Select Use By Date" />
              </Field>
              <Field label="Packaged Net Weight In Grams" className="sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  value={values.packagedNetWeightInGrams}
                  onChange={(e) => set("packagedNetWeightInGrams", e.target.value)}
                  placeholder="Enter Weight in Grams"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Documents & QR Codes */}
        <div className="rounded-xl bg-muted/40 p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold">Documents & QR Codes</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="COA DOC (Upload Documents)">
              <SimpleFileUpload
                files={coaDocuments}
                onChange={setCoaDocuments}
                maxCount={3}
                icon={<FileText className="size-6 text-muted-foreground" />}
                hint="Support for PDF, DOC, DOCX files. Max 3 files."
              />
            </Field>
            <Field label="TEST QR CODE (Upload Documents)">
              <SimpleFileUpload
                files={qrCodeDocuments}
                onChange={setQrCodeDocuments}
                maxCount={3}
                accept="image/*"
                icon={<QrCode className="size-6 text-muted-foreground" />}
                hint="Support for PNG, JPG, JPEG files. Max 3 files."
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="h-9! px-5! text-[14px]!" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
    </>
  );

  return (
    <TooltipProvider>
      {isDrawerMode ? (
        <Drawer open={!!open} onClose={onClose} side="right" size="76vw">
          <div className="flex h-full flex-col bg-[#F9F9F9]">
            {headerBar}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 [&_.bg-transparent]:bg-white [&_.h-8]:h-9 [&_[data-slot=input]]:h-9 [&_[data-slot=select-trigger]]:h-9">
              {formBody}
            </div>
          </div>
        </Drawer>
      ) : (
        <div className="flex flex-col gap-4 p-6">
          {headerBar}
          {formBody}
        </div>
      )}
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
      <label className="mb-1.5 flex items-center gap-1 text-sm font-normal text-foreground/70">
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
