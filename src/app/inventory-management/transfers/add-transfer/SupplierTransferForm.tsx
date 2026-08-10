"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSuppliersList } from "@/services/suppliers/list";
import { fetchProductsList } from "@/services/products/list";
import { getSingleProduct } from "@/services/products/getSingleProduct";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchUomList } from "@/services/uom/list";
import { generateExternalPackageId } from "@/services/packages/generateExternalId";
import { createIncomingSupplierTransfer } from "@/services/transfers/createIncomingSupplier";
import { createOutgoingSupplierTransfer } from "@/services/transfers/createOutgoingSupplier";
import { fetchSingleInventoryByProductId } from "@/services/inventories/getSingleByProductId";

import AddEditProductDrawer from "@/app/catalog/products/AddEditProductDrawer";
import DrawerPricingDetails from "./DrawerPricingDetails";


import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ApiSelect } from "@/components/ui/api-select";
import { DocumentsUpload } from "@/components/admin/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Drawer from "@/components/ui/Drawer";
import PackagePickerTable, { type PackagePickerRow } from "./PackagePickerTable";
import { useSettings } from "@/context/settings-context";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

interface PackageEntry {
  id: string;
  packageId: string;
  productId: string | null;
  productName: string | null;
  quantity: string;
  unitOfMeasure: string;
  uomId: string | null;
  unitCost: string;
  unitPrice: string;
  expiryDate: string;
  externalBatchId: string;
  unitWeight: string;
  unitWeightUoMId: string | null;
  isActive: boolean;
  lowStockPoint: string;
}

interface AssignDraft {
  productId: string | null;
  productName: string | null;
  quantity: string;
  totalCost: string;
  unitPrice: string;
  expiryDate: string;
  externalBatchId: string;
  unitWeight: string;
  unitWeightUoMId: string | null;
  isActive: boolean;
  lowStockPoint: string;
  unitOfMeasure: string;
  uomId: string | null;
}

function newEntry(uoms: any[]): PackageEntry {
  const each = uoms.find((u) => u.name?.toLowerCase() === "each");
  const first = uoms[0];
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    packageId: "",
    productId: null,
    productName: null,
    quantity: "",
    unitOfMeasure: each?.name ?? first?.name ?? "",
    uomId: each?.id ?? first?.id ?? null,
    unitCost: "",
    unitPrice: "",
    expiryDate: "",
    externalBatchId: "",
    unitWeight: "",
    unitWeightUoMId: null,
    isActive: true,
    lowStockPoint: "",
  };
}

export default function SupplierTransferForm() {
  const { defaultPageSize } = useSettings();
  const router = useRouter();
  const { shopId } = useShop();

  const [type, setType] = useState<"incoming" | "outgoing">("incoming");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [documentLinks, setDocumentLinks] = useState<string[]>([]);

  const [uoms, setUoms] = useState<any[]>([]);
  const [entries, setEntries] = useState<PackageEntry[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [assigningEntryId, setAssigningEntryId] = useState<string | null>(null);
  const [pendingNewEntry, setPendingNewEntry] = useState<PackageEntry | null>(null);
  const [assignDraft, setAssignDraft] = useState<AssignDraft>({
    productId: null,
    productName: null,
    quantity: "",
    totalCost: "",
    unitPrice: "",
    expiryDate: "",
    externalBatchId: "",
    unitWeight: "",
    unitWeightUoMId: null,
    isActive: true,
    lowStockPoint: "",
    unitOfMeasure: "",
    uomId: null,
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [inventoryDetails, setInventoryDetails] = useState<any>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [drawerScreen, setDrawerScreen] = useState<"main" | "editPricing">("main");
  const [showConversion, setShowConversion] = useState(false);
  const [conversionUomId, setConversionUomId] = useState<string | null>(null);
  const [conversionRate, setConversionRate] = useState("");

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PackagePickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedRows, setSelectedRows] = useState<(PackagePickerRow & { unitPrice?: number })[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    fetchUomList({ page: 1, limit: 300 }).then((res) => {
      setUoms(res?.data?.data?.uoms ?? []);
    });
  }, []);

  const fetchSupplierPage = useCallback(async (pageNum: number, term: string) => {
    const res = await fetchSuppliersList({ limit: 10, page: pageNum, search: term } as any);
    return {
      items: (res?.data ?? []).map((s: any) => ({ id: s.id, name: s.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchProductPage = useCallback(async (pageNum: number, term: string) => {
    const res = await fetchProductsList({ limit: 10, page: pageNum, search: term } as any);
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const loadPackages = useCallback(
    async (targetPage = 1, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { limit: size, page: targetPage, isFinished: false, sortByAlpha: 1 };
        if (search) params.packageName = search;
        const res = await fetchPackagesMinimalExtended(shopId, params);
        setRows(res?.data?.packages ?? []);
        const pag = res?.data?.paginationData ?? {};
        setTotalPages(pag.totalPages ?? 1);
        setTotalEntries(pag.totalEntries ?? 0);
        setPage(pag.currentPage ?? targetPage);
      } catch (err: any) {
        toast.error(err?.message || "Failed to fetch packages");
      } finally {
        setLoading(false);
      }
    },
    [shopId, search, pageSize]
  );

  useEffect(() => {
    if (type === "outgoing") loadPackages(1);
  }, [type, loadPackages]);

  const addingEntryRef = useRef(false);
  const addEntry = async () => {
    if (!shopId || addingEntryRef.current) return;
    addingEntryRef.current = true;
    const entry = newEntry(uoms);
    setGeneratingId(entry.id);
    try {
      const res = await generateExternalPackageId(shopId);
      const packageId = res?.data?.packageId;
      if (entries.some((e) => e.packageId === packageId) || pendingNewEntry?.packageId === packageId) {
        toast.warning("Generated Package ID already exists. Please try again.");
      } else {
        openAssignDrawer({ ...entry, packageId }, { isNew: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate Package ID.");
    } finally {
      setGeneratingId(null);
      addingEntryRef.current = false;
    }
  };
  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const updateEntry = (id: string, patch: Partial<PackageEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleGenerateId = async (id: string) => {
    if (!shopId) return;
    setGeneratingId(id);
    try {
      const res = await generateExternalPackageId(shopId);
      const packageId = res?.data?.packageId;
      if (entries.some((e) => e.packageId === packageId)) {
        toast.warning("Generated Package ID already exists. Please generate again.");
      } else {
        updateEntry(id, { packageId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate Package ID.");
    } finally {
      setGeneratingId(null);
    }
  };

  const loadInventoryForProduct = async (productId: string) => {
    if (!shopId) return;
    setInventoryLoading(true);
    try {
      const res = await fetchSingleInventoryByProductId(productId, shopId);
      const inventory = (res as any)?.data?.data?.inventory ?? null;
      setInventoryDetails(inventory);
      if (inventory?.pricingInfo?.unitPrice != null) {
        setAssignDraft((prev) => ({ ...prev, unitPrice: prev.unitPrice || String(inventory.pricingInfo.unitPrice) }));
      }
      if (inventory?.projectQtyUomId && inventory?.projectQtyConversionRate) {
        setConversionUomId(inventory.projectQtyUomId);
        setConversionRate(String(inventory.projectQtyConversionRate));
        setShowConversion(true);
      }
    } catch {
      setInventoryDetails(null);
    } finally {
      setInventoryLoading(false);
    }
  };

  const selectProduct = (id: string | null, name: string | null) => {
    setAssignDraft((prev) => ({ ...prev, productId: id, productName: name }));
    setDrawerScreen("main");
    setShowConversion(false);
    setConversionUomId(null);
    setConversionRate("");
    if (id) {
      loadInventoryForProduct(id);
      getSingleProduct(id)
        .then((res: any) => {
          const p = res?.data?.data?.product ?? res?.data?.product;
          if (!p) return;
          setAssignDraft((prev) => ({
            ...prev,
            unitWeight: prev.unitWeight || (p.unitWeight != null ? String(p.unitWeight) : ""),
            unitWeightUoMId: prev.unitWeightUoMId || p.unitWeightUom?.id || null,
          }));
        })
        .catch(() => {});
    } else {
      setInventoryDetails(null);
    }
  };

  const openAssignDrawer = (entry: PackageEntry, opts: { isNew?: boolean } = {}) => {
    setAssignDraft({
      productId: entry.productId,
      productName: entry.productName,
      quantity: entry.quantity,
      totalCost: entry.unitCost && entry.quantity ? (parseFloat(entry.unitCost) * parseFloat(entry.quantity)).toFixed(2) : "",
      unitPrice: entry.unitPrice,
      expiryDate: entry.expiryDate,
      externalBatchId: entry.externalBatchId,
      unitWeight: entry.unitWeight,
      unitWeightUoMId: entry.unitWeightUoMId,
      isActive: entry.isActive,
      lowStockPoint: entry.lowStockPoint,
      unitOfMeasure: entry.unitOfMeasure,
      uomId: entry.uomId,
    });
    setDrawerScreen("main");
    setShowConversion(false);
    setConversionUomId(null);
    setConversionRate("");
    setInventoryDetails(null);
    if (entry.productId) loadInventoryForProduct(entry.productId);
    if (opts.isNew) {
      setPendingNewEntry(entry);
      setAssigningEntryId(null);
    } else {
      setAssigningEntryId(entry.id);
      setPendingNewEntry(null);
    }
  };

  const closeAssignDrawer = () => {
    setAssigningEntryId(null);
    setPendingNewEntry(null);
    setInventoryDetails(null);
    setConversionUomId(null);
    setConversionRate("");
    setDrawerScreen("main");
    setShowConversion(false);
  };

  const handleSaveAssignment = () => {
    const quantityValue = parseFloat(assignDraft.quantity);
    const totalCostValue = parseFloat(assignDraft.totalCost);
    if (!totalCostValue || totalCostValue <= 0) {
      toast.error("Total Cost (Wholesale) is required and must be greater than 0");
      return;
    }
    if (!quantityValue || quantityValue <= 0) {
      toast.error("Quantity is required and must be greater than 0");
      return;
    }
    if (!assignDraft.productId) {
      toast.error("Please select a product");
      return;
    }
    const patch = {
      productId: assignDraft.productId,
      productName: assignDraft.productName,
      quantity: assignDraft.quantity,
      unitCost: (totalCostValue / quantityValue).toFixed(2),
      unitPrice: assignDraft.unitPrice,
      expiryDate: assignDraft.expiryDate,
      externalBatchId: assignDraft.externalBatchId,
      unitWeight: assignDraft.unitWeight,
      unitWeightUoMId: assignDraft.unitWeightUoMId,
      isActive: assignDraft.isActive,
      lowStockPoint: assignDraft.lowStockPoint,
      unitOfMeasure: assignDraft.unitOfMeasure,
      uomId: assignDraft.uomId,
    };
    if (pendingNewEntry) {
      setEntries((prev) => [...prev, { ...pendingNewEntry, ...patch }]);
    } else if (assigningEntryId) {
      updateEntry(assigningEntryId, patch);
    }
    toast.success("Product assignment saved successfully");
    closeAssignDrawer();
  };

  const totalCost = (e: PackageEntry) => (parseFloat(e.quantity) || 0) * (parseFloat(e.unitCost) || 0);
  const grandTotal = useMemo(() => entries.reduce((sum, e) => sum + totalCost(e), 0), [entries]);

  const filledEntries = useMemo(
    () => entries.filter((e) => e.packageId || e.productId || e.quantity),
    [entries]
  );

  const validateEntries = () => {
    const packageIds = filledEntries.map((e) => e.packageId).filter(Boolean);
    if (new Set(packageIds).size !== packageIds.length) {
      toast.error("Duplicate Package IDs detected. Please ensure all Package IDs are unique.");
      return false;
    }
    if (filledEntries.length === 0) {
      toast.error("Please add at least one package entry.");
      return false;
    }
    for (const e of filledEntries) {
      if (!e.packageId || !e.productId || !e.quantity || !e.unitCost || !e.uomId) {
        toast.error("Please fill in all required fields for every package entry.");
        return false;
      }
    }
    return true;
  };

  const handleCreateIncoming = async () => {
    if (!shopId || !supplierId) {
      toast.error("Please select a supplier.");
      return;
    }
    if (!validateEntries()) return;

    setSubmitting(true);
    try {
      await createIncomingSupplierTransfer(shopId, {
        supplierId,
        packages: filledEntries.map((e) => ({
          quantity: parseFloat(e.quantity) || 0,
          unitCost: parseFloat(e.unitCost) || 0,
          advertisedId: e.packageId,
          recommendedProductId: e.productId,
          uomId: e.uomId,
          externalBatchId: e.externalBatchId || null,
          expiryDate: e.expiryDate || null,
        })),
        notes: notes || null,
        documentLinks,
      });
      toast.success("Transfer created successfully! Complete it from the transfer's Manage page to generate a Purchase Order.");
      router.push("/inventory-management/transfers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create transfer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOutgoing = async () => {
    if (!shopId || !supplierId) {
      toast.error("Please select a destination supplier.");
      return;
    }
    if (selectedRows.length === 0) {
      toast.error("Please select at least one package for transfer.");
      return;
    }
    setSubmitting(true);
    try {
      await createOutgoingSupplierTransfer(shopId, {
        toSupplierId: supplierId,
        packages: selectedRows.map((row) => ({
          id: row.id,
          unitPrice: row.unitPrice ?? 1,
          advertisedId: row.advertisedId ?? null,
        })),
        notes: notes || null,
        documentLinks,
      });
      toast.success("Outgoing transfer created successfully!");
      router.push("/inventory-management/transfers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create outgoing transfer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRow = (row: PackagePickerRow, checked: boolean) => {
    if (checked) {
      if (selectedRows.length >= 10) {
        toast.error("Cannot select more than 10 packages at once!");
        return;
      }
      setSelectedRows((prev) => [...prev, { ...row, unitPrice: 1 }]);
    } else {
      setSelectedRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };
  const updateUnitPrice = (id: string, value: number) =>
    setSelectedRows((prev) => prev.map((r) => (r.id === id ? { ...r, unitPrice: value } : r)));
  const selectedIds = useMemo(() => selectedRows.map((r) => r.id), [selectedRows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-muted/30 p-5">
        <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Transfer Information</p>

        <div className="mb-4 flex overflow-hidden rounded-lg bg-muted p-0.5 w-fit">
          {(["incoming", "outgoing"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setType(opt)}
              className={`rounded-[7px] px-4 py-1.5 text-sm capitalize transition-colors ${
                type === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {type === "incoming" ? "Select Supplier" : "Select Destination Supplier"} <span className="text-destructive">*</span>
            </p>
            <ApiSelect
              placeholder="Select supplier"
              value={supplierId}
              onChange={(v) => setSupplierId(v as string | null)}
              fetchPage={fetchSupplierPage}
              triggerClassName="h-10! w-full"
            />
          </div>

          {type === "incoming" && (
            <div>
              <p className="mb-1 text-xs font-medium text-transparent select-none">Add</p>
              <Button className="h-10! text-sm!" disabled={generatingId !== null} onClick={addEntry}>
                {generatingId !== null && <Loader2 className="size-4 animate-spin" />}
                Add Package Entry
              </Button>
            </div>
          )}

          <div className="min-w-64 flex-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
              rows={1}
              className="h-10 min-h-0 resize-none bg-background py-2"
            />
          </div>
        </div>
      </div>

      {type === "incoming" ? (
        <>
          <div className="flex flex-col gap-3">
            {entries.map((entry) => {
              const unitPriceNum = parseFloat(entry.unitPrice) || 0;
              const unitCostNum = parseFloat(entry.unitCost) || 0;
              const totalPrice = unitPriceNum * (parseFloat(entry.quantity) || 0);
              const margin = unitPriceNum > 0 ? ((unitPriceNum - unitCostNum) / unitPriceNum) * 100 : 0;

              if (!entry.productId) {
                return (
                  <div key={entry.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      {entry.packageId ? (
                        <span className="text-lg font-bold">{entry.packageId}</span>
                      ) : (
                        <Button size="sm" disabled={generatingId === entry.id} onClick={() => handleGenerateId(entry.id)}>
                          {generatingId === entry.id && <Loader2 className="size-3.5 animate-spin" />}
                          Generate Package ID
                        </Button>
                      )}
                      <Button variant="destructive" size="icon-sm" onClick={() => removeEntry(entry.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Product</p>
                        <p className="text-sm text-muted-foreground">No product assigned</p>
                      </div>
                      <Button variant="outline" size="sm" disabled={!entry.packageId} onClick={() => openAssignDrawer(entry)}>
                        Assign Product
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.id} className="w-1/2 rounded-lg border border-emerald-500 p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-xl font-bold">{entry.packageId}</p>
                      <p className="text-sm text-muted-foreground">Package ID</p>
                    </div>
                    <Badge variant="secondary" className="rounded-md text-xs text-emerald-600" style={{ backgroundColor: "#F5FCED" }}>
                      Assigned
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Package ID:</p>
                      <p className="mt-1 text-muted-foreground">{entry.packageId}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Unit Weight:</p>
                      <p className="mt-1 text-muted-foreground">{entry.unitWeight || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Product Name:</p>
                      <p className="mt-1 text-muted-foreground">{entry.productName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Batch ID:</p>
                      <p className="mt-1 text-muted-foreground">{entry.externalBatchId || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Quantity:</p>
                      <p className="mt-1 text-muted-foreground">
                        {entry.quantity} {entry.unitOfMeasure}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Unit Cost:</p>
                      <p className="mt-1 text-muted-foreground">${unitCostNum.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Expiry Date:</p>
                      <p className="mt-1 text-muted-foreground">{entry.expiryDate || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Unit Price:</p>
                      <p className="mt-1 text-muted-foreground">${unitPriceNum.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-4 border-t border-border pt-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Unit Cost:</p>
                      <p className="mt-1 font-semibold">${unitCostNum.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Total Cost:</p>
                      <p className="mt-1 font-semibold">${totalCost(entry).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Unit Price:</p>
                      <p className="mt-1 font-semibold">${unitPriceNum.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Total Price:</p>
                      <p className="mt-1 font-semibold">${totalPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Margin:</p>
                      <p className="mt-1 font-semibold text-emerald-600">{margin.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
                    <Button variant="outline" className="h-10! text-sm! text-destructive" onClick={() => removeEntry(entry.id)}>
                      Remove Entry
                    </Button>
                    <Button className="h-10! text-sm!" onClick={() => openAssignDrawer(entry)}>
                      Edit Assign Product Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Documents</span>
            <DocumentsUpload links={documentLinks} onChange={setDocumentLinks} />
          </div>

          <div className="flex justify-end rounded-lg bg-muted/50 p-4">
            <span className="text-lg font-semibold">Grand Total Cost: ${grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              disabled={filledEntries.length === 0 || !supplierId}
              onClick={() => setShowPaymentDialog(true)}
            >
              Review
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Documents</span>
            <DocumentsUpload links={documentLinks} onChange={setDocumentLinks} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">Select Packages For Transfer</span>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge>{selectedIds.length} selected</Badge>
                  <Button variant="outline" size="sm" onClick={() => setSelectedRows([])}>
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <Input
              placeholder="Search by package name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-56"
            />

            {selectedRows.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Unit price per selected package</span>
                <div className="flex flex-wrap gap-2">
                  {selectedRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1 text-sm">
                      <span className="max-w-32 truncate">{row.advertisedId}</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.unitPrice ?? 1}
                        onChange={(e) => updateUnitPrice(row.id, parseFloat(e.target.value) || 0)}
                        className="h-7 w-20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PackagePickerTable
              rows={rows}
              loading={loading}
              selectedIds={selectedIds}
              onToggle={toggleRow}
              page={page}
              totalPages={totalPages}
              totalEntries={totalEntries}
              pageSize={pageSize}
              onPageChange={loadPackages}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(s) => {
                setPageSize(s);
                loadPackages(1, s);
              }}
            />
          </div>

          <div className="flex justify-end">
            <Button disabled={submitting || selectedRows.length === 0 || !supplierId} onClick={handleCreateOutgoing}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Create Transfer {selectedRows.length > 0 && `(${selectedRows.length})`}
            </Button>
          </div>
        </>
      )}

      <Drawer open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} side="right" size="40vw">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-8 pt-8 pb-4">
            <h2 className="text-base font-medium text-gray-700">Transfer Review</h2>
            <button type="button" onClick={() => setShowPaymentDialog(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-8 py-6">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">Package Details</p>
              {filledEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Package ID</p>
                      <p className="text-sm font-medium">{entry.packageId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Product Name</p>
                      <p className="text-sm font-medium">{entry.productName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="text-sm font-medium">
                        {entry.quantity || "-"} {entry.unitOfMeasure}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unit Cost</p>
                      <p className="text-sm font-medium">${parseFloat(entry.unitCost || "0").toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="text-sm font-medium">${totalCost(entry).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unit Price</p>
                      <p className="text-sm font-medium">${parseFloat(entry.unitPrice || "0").toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end rounded-lg bg-muted/50 p-4">
              <span className="text-base font-semibold">Grand Total Cost: ${grandTotal.toFixed(2)}</span>
            </div>

            <p className="text-sm text-muted-foreground">
              The transfer will be created as &quot;In Route&quot;. Complete it from the transfer&apos;s Manage page to set final prices and generate a Purchase Order.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" className="h-10! text-sm!" onClick={() => setShowPaymentDialog(false)}>
              Back
            </Button>
            <Button
              className="h-10! text-sm!"
              disabled={submitting}
              onClick={() => {
                setShowPaymentDialog(false);
                handleCreateIncoming();
              }}
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Create Transfer
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer open={assigningEntryId !== null || pendingNewEntry !== null} onClose={closeAssignDrawer} side="right" size="75vw">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-8 pt-8 pb-4">
            <h2 className="text-base font-medium text-gray-700">Assign Product to Package</h2>
            <button type="button" onClick={closeAssignDrawer} className="text-muted-foreground hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {assignDraft.productId && (
              <div className="flex items-center gap-10 border-b border-border pl-2 text-sm">
                <button
                  type="button"
                  onClick={() => setDrawerScreen("main")}
                  className={`-mb-px border-b-2 pb-2 font-medium ${
                    drawerScreen === "main" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                >
                  Import Package
                </button>
                <button
                  type="button"
                  disabled={!inventoryDetails}
                  onClick={() => setDrawerScreen("editPricing")}
                  className={`-mb-px border-b-2 pb-2 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                    drawerScreen === "editPricing" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                >
                  Edit Pricing
                </button>
              </div>
            )}

            {drawerScreen === "main" && (
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Package Information</p>
                  <p className="mt-1.5 text-lg font-semibold">
                    Package ID:{" "}
                    <span className="text-primary">
                      {pendingNewEntry?.packageId ?? entries.find((e) => e.id === assigningEntryId)?.packageId}
                    </span>
                  </p>
                </div>
                <Button className="h-11! px-5 text-base!" onClick={() => setShowAddProduct(true)}>
                  Add New Product
                </Button>
              </div>
            )}

            {drawerScreen === "editPricing" ? (
              inventoryDetails && shopId ? (
                <DrawerPricingDetails
                  inventoryId={inventoryDetails.id}
                  shopId={shopId}
                  editMode
                  inventoryData={inventoryDetails}
                  sellableUoMId={inventoryDetails.sellableUoMId}
                  onSaveSuccess={() => {
                    toast.success("Pricing updated successfully");
                    if (assignDraft.productId) loadInventoryForProduct(assignDraft.productId);
                    setDrawerScreen("main");
                  }}
                />
              ) : null
            ) : (
              <>
                {assignDraft.productId && (
                  <div className="w-1/2 rounded-lg border border-border bg-muted/30 p-5">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={showConversion}
                        onChange={(e) => setShowConversion(e.target.checked)}
                      />
                      Enable Conversion
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      View how this product converts incoming transfer quantities into a different sellable unit.
                    </p>

                    {showConversion && (
                      <div className="mt-4 flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium">Target Unit of Measure</span>
                          <Select
                            items={uoms.map((u) => ({ value: u.id, label: u.name }))}
                            value={conversionUomId ?? undefined}
                            onValueChange={(v) => setConversionUomId(v as string)}
                          >
                            <SelectTrigger className="h-10! w-full bg-background">
                              <SelectValue placeholder="Select UoM" />
                            </SelectTrigger>
                            <SelectContent>
                              {uoms.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium">Conversion Rate</span>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Enter conversion rate"
                            value={conversionRate}
                            onChange={(e) => setConversionRate(e.target.value)}
                            className="h-10 bg-background"
                          />
                        </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <div>
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                              Original Quantity
                            </p>
                            <p className="text-lg font-bold">
                              {inventoryDetails?.totalQuantity ?? assignDraft.quantity ?? "-"}{" "}
                              <span className="text-sm font-normal">
                                {inventoryDetails?.sellableUoMShortForm ??
                                  pendingNewEntry?.unitOfMeasure ??
                                  entries.find((e) => e.id === assigningEntryId)?.unitOfMeasure}
                              </span>
                            </p>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="text-right">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                              Converts To (Rate: {conversionRate || "-"})
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {(inventoryDetails?.totalQuantity || parseFloat(assignDraft.quantity)) > 0 && parseFloat(conversionRate) > 0
                                ? (
                                    (inventoryDetails?.totalQuantity ?? parseFloat(assignDraft.quantity)) / parseFloat(conversionRate)
                                  ).toFixed(2)
                                : "-"}{" "}
                              <span className="text-sm font-normal">{uoms.find((u) => u.id === conversionUomId)?.shortForm ?? ""}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-border p-5">
                  <span className="text-sm font-medium text-gray-700">
                    Select Product from Catalog <span className="text-destructive">*</span>
                  </span>
                  <ApiSelect
                    placeholder="Search and select a product..."
                    value={assignDraft.productId}
                    onChange={(v, opt) => selectProduct(v as string | null, opt?.name ?? null)}
                    fetchPage={fetchProductPage}
                    triggerClassName="mt-1.5 h-11! w-full text-base!"
                  />
                </div>

                {inventoryLoading && <p className="text-sm text-muted-foreground">Loading pricing info...</p>}

                {!inventoryLoading && inventoryDetails && (
                  <div className="rounded-lg border border-border p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-700">Current Pricing Overview</span>
                      <Button className="h-9! px-4 text-sm!" onClick={() => setDrawerScreen("editPricing")}>
                        Edit Pricing →
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 text-base">
                      <div className="flex justify-between border-b border-border pb-3">
                        <span className="text-muted-foreground">Unit Price:</span>
                        <span className="font-medium">${inventoryDetails.pricingInfo?.unitPrice ?? 0}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-3">
                        <span className="text-muted-foreground">UoM:</span>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-3 py-1 text-sm text-sky-600"
                          style={{ backgroundColor: "#E6F7FF", borderColor: "currentColor" }}
                        >
                          {inventoryDetails.sellableUoMShortForm ?? "-"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tiered Pricing:</span>
                        {inventoryDetails.pricingInfo?.isTieredPricingApplicable ? (
                          <Badge
                            variant="secondary"
                            className="rounded-md px-3 py-1 text-sm text-emerald-600"
                            style={{ backgroundColor: "#F5FCED", borderColor: "currentColor" }}
                          >
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="px-3 py-1 text-sm">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-5">
                    <span className="text-sm font-medium text-gray-700">
                      Quantity <span className="text-destructive">*</span>
                    </span>
                    <div className="mt-1.5 flex">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Enter quantity"
                        value={assignDraft.quantity}
                        onChange={(e) => setAssignDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                        className="h-11 w-1/2 rounded-r-none border-r-0 text-base"
                      />
                      <Select
                        items={uoms.map((u) => ({ value: u.id, label: u.name }))}
                        value={assignDraft.uomId ?? undefined}
                        onValueChange={(v) => {
                          const uom = uoms.find((u) => u.id === v);
                          setAssignDraft((prev) => ({ ...prev, uomId: v as string, unitOfMeasure: uom?.name ?? prev.unitOfMeasure }));
                        }}
                      >
                        <SelectTrigger className="h-11! w-1/2 rounded-l-none">
                          <SelectValue placeholder="Select UoM" />
                        </SelectTrigger>
                        <SelectContent>
                          {uoms.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-5">
                    <span className="text-sm font-medium text-gray-700">
                      Total Cost (Wholesale) <span className="text-destructive">*</span>
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={assignDraft.totalCost}
                      onChange={(e) => setAssignDraft((prev) => ({ ...prev, totalCost: e.target.value }))}
                      className="mt-1.5 h-11 text-base"
                    />
                    {assignDraft.totalCost && parseFloat(assignDraft.quantity) > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Unit cost = ${assignDraft.totalCost} / {assignDraft.quantity} = $
                        {(parseFloat(assignDraft.totalCost) / parseFloat(assignDraft.quantity)).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-5">
                    <span className="text-sm font-medium text-gray-700">Unit Weight</span>
                    <div className="mt-1.5 flex">
                      <Input
                        type="number"
                        min={0}
                        placeholder="10"
                        disabled
                        value={assignDraft.unitWeight}
                        className="h-11 rounded-r-none border-r-0 text-base"
                      />
                      <div className="flex h-11 items-center rounded-r-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                        {uoms.find((u) => u.id === assignDraft.unitWeightUoMId)?.name ?? "Grams"}
                      </div>
                    </div>
                  </div>
                </div>

                {!inventoryDetails && (
                  <div className="rounded-lg border border-border p-5">
                    <span className="text-sm font-medium text-gray-700">Recommended Unit Price</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={assignDraft.unitPrice}
                      onChange={(e) => setAssignDraft((prev) => ({ ...prev, unitPrice: e.target.value }))}
                      className="mt-1.5 h-11 text-base"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-5">
                  <span className="text-sm font-medium text-gray-700">Activate package upon import</span>
                  <Switch
                    checked={assignDraft.isActive}
                    onCheckedChange={(checked) => setAssignDraft((prev) => ({ ...prev, isActive: checked }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-5">
                    <span className="text-sm font-medium text-gray-700">Low Stock Point</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Enter minimum stock level"
                      value={assignDraft.lowStockPoint}
                      onChange={(e) => setAssignDraft((prev) => ({ ...prev, lowStockPoint: e.target.value }))}
                      className="mt-1.5 h-11 text-base"
                    />
                    <p className="mt-1 text-sm text-muted-foreground">Minimum quantity before low stock alert</p>
                  </div>
                  <div className="rounded-lg border border-border p-5">
                    <span className="text-sm font-medium text-gray-700">Expiry Date</span>
                    <input
                      type="date"
                      value={assignDraft.expiryDate}
                      onChange={(e) => setAssignDraft((prev) => ({ ...prev, expiryDate: e.target.value }))}
                      className="mt-1.5 h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring"
                    />
                  </div>
                  <div className="rounded-lg border border-border p-5">
                    <span className="text-sm font-medium text-gray-700">External Batch ID</span>
                    <Input
                      placeholder="Enter external batch ID"
                      value={assignDraft.externalBatchId}
                      onChange={(e) => setAssignDraft((prev) => ({ ...prev, externalBatchId: e.target.value }))}
                      className="mt-1.5 h-11 text-base"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {drawerScreen === "main" ? (
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="outline" className="h-11! px-5 text-base!" onClick={closeAssignDrawer}>
                Cancel
              </Button>
              <Button className="h-11! px-5 text-base!" disabled={!assignDraft.productId} onClick={handleSaveAssignment}>
                Save Assignment
              </Button>
            </div>
          ) : (
            <div className="flex justify-between gap-2 border-t border-border px-6 py-4">
              <Button variant="outline" className="h-11! px-5 text-base!" onClick={() => setDrawerScreen("main")}>
                Back to Import
              </Button>
              <Button variant="outline" className="h-11! px-5 text-base!" onClick={closeAssignDrawer}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      <AddEditProductDrawer
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onDone={(created) => {
          setShowAddProduct(false);
          if (created) selectProduct(created.id, created.name);
        }}
      />
    </div>
  );
}
