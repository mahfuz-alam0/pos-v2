"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSuppliersList } from "@/services/suppliers/list";
import { fetchProductsList } from "@/services/products/list";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchUomList } from "@/services/uom/list";
import { generateExternalPackageId } from "@/services/packages/generateExternalId";
import { createIncomingSupplierTransfer } from "@/services/transfers/createIncomingSupplier";
import { completeIncomingSupplierTransfer } from "@/services/transfers/completeIncomingSupplier";
import { createOutgoingSupplierTransfer } from "@/services/transfers/createOutgoingSupplier";
import { createPurchaseOrderFromTransfer } from "@/services/purchaseOrders/createFromTransfer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import PackagePickerTable, { type PackagePickerRow } from "./PackagePickerTable";

const PAGE_SIZE = 30;

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
  };
}

export default function SupplierTransferForm() {
  const router = useRouter();
  const { shopId } = useShop();

  const [type, setType] = useState<"incoming" | "outgoing">("incoming");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [uoms, setUoms] = useState<any[]>([]);
  const [entries, setEntries] = useState<PackageEntry[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PackagePickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [selectedRows, setSelectedRows] = useState<(PackagePickerRow & { unitPrice?: number })[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("");

  useEffect(() => {
    fetchUomList({ page: 1, limit: 300 }).then((res) => {
      const list = res?.data?.data?.uoms ?? [];
      setUoms(list);
      if (entries.length === 0) setEntries([newEntry(list)]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    async (targetPage = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { limit: PAGE_SIZE, page: targetPage, isFinished: false, sortByAlpha: 1 };
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
    [shopId, search]
  );

  useEffect(() => {
    if (type === "outgoing") loadPackages(1);
  }, [type, loadPackages]);

  const addEntry = () => setEntries((prev) => [...prev, newEntry(uoms)]);
  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const updateEntry = (id: string, patch: Partial<PackageEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleUomChange = (id: string, name: string) => {
    const uom = uoms.find((u) => u.name === name);
    updateEntry(id, { unitOfMeasure: name, uomId: uom?.id ?? null });
  };

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

  const handleCreateIncoming = async (terms: string) => {
    if (!shopId || !supplierId) {
      toast.error("Please select a supplier.");
      return;
    }
    if (!validateEntries()) return;

    setSubmitting(true);
    try {
      const res = await createIncomingSupplierTransfer(shopId, {
        supplierId,
        packages: filledEntries.map((e) => ({
          quantity: parseFloat(e.quantity) || 0,
          unitCost: parseFloat(e.unitCost) || 0,
          advertisedId: e.packageId,
          recommendedProductId: e.productId,
          uomId: e.uomId,
        })),
        notes: notes || null,
        documentLinks: [],
      });
      const jobId = res?.data?.jobId;
      if (!jobId) throw new Error("Job ID not received from API");

      await completeIncomingSupplierTransfer(shopId, {
        transferId: jobId,
        productPriceRecommendations: filledEntries.map((e) => ({
          productId: e.productId,
          price: parseFloat(e.unitPrice) || 0,
        })),
      });

      try {
        await createPurchaseOrderFromTransfer(jobId, shopId, { paymentTerms: terms });
        toast.success("Transfer created and Purchase Order generated successfully!");
      } catch (poErr: any) {
        toast.error(poErr?.message || "Transfer completed, but failed to create the Purchase Order");
      }

      router.push("/admin/inventory/transfers");
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
        documentLinks: [],
      });
      toast.success("Outgoing transfer created successfully!");
      router.push("/admin/inventory/transfers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create outgoing transfer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRow = (row: PackagePickerRow, checked: boolean) => {
    if (checked) setSelectedRows((prev) => [...prev, { ...row, unitPrice: 1 }]);
    else setSelectedRows((prev) => prev.filter((r) => r.id !== row.id));
  };
  const updateUnitPrice = (id: string, value: number) =>
    setSelectedRows((prev) => prev.map((r) => (r.id === id ? { ...r, unitPrice: value } : r)));
  const selectedIds = useMemo(() => selectedRows.map((r) => r.id), [selectedRows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex overflow-hidden rounded-lg bg-muted p-0.5 w-fit">
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

      <div className="rounded-lg bg-muted/40 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {type === "incoming" ? "Select Supplier" : "Select Destination Supplier"} <span className="text-destructive">*</span>
            </p>
            <ApiSelect placeholder="Select supplier" value={supplierId} onChange={(v) => setSupplierId(v as string | null)} fetchPage={fetchSupplierPage} />
          </div>
          <div className="min-w-52 flex-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter notes" rows={1} />
          </div>
        </div>
      </div>

      {type === "incoming" ? (
        <>
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {entry.packageId ? (
                      <span className="text-lg font-bold">{entry.packageId}</span>
                    ) : (
                      <Button size="sm" disabled={generatingId === entry.id} onClick={() => handleGenerateId(entry.id)}>
                        {generatingId === entry.id && <Loader2 className="size-3.5 animate-spin" />}
                        Generate Package ID
                      </Button>
                    )}
                    {entry.productId && <Badge>Assigned</Badge>}
                  </div>
                  <Button variant="destructive" size="icon-sm" onClick={() => removeEntry(entry.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2">
                    <p className="mb-1 text-xs text-muted-foreground">Product</p>
                    <ApiSelect
                      placeholder="Select product"
                      value={entry.productId}
                      onChange={(v, opt) => updateEntry(entry.id, { productId: v as string | null, productName: opt?.name ?? null })}
                      fetchPage={fetchProductPage}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Quantity</p>
                    <Input
                      type="number"
                      min={0}
                      value={entry.quantity}
                      onChange={(e) => updateEntry(entry.id, { quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">UoM</p>
                    <Select value={entry.unitOfMeasure || undefined} onValueChange={(v) => handleUomChange(entry.id, v as string)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select UoM" />
                      </SelectTrigger>
                      <SelectContent>
                        {uoms.map((u) => (
                          <SelectItem key={u.id} value={u.name}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Unit Cost</p>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={entry.unitCost}
                      onChange={(e) => updateEntry(entry.id, { unitCost: e.target.value })}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Unit Price</p>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={entry.unitPrice}
                      onChange={(e) => updateEntry(entry.id, { unitPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Total Cost</p>
                    <p className="pt-1.5 text-sm font-semibold">${totalCost(entry).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-fit" onClick={addEntry}>
            <Plus className="size-4" />
            Add Package Entry
          </Button>

          <div className="flex justify-end rounded-lg bg-muted/50 p-4">
            <span className="text-lg font-semibold">Grand Total Cost: ${grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              disabled={filledEntries.length === 0 || !supplierId}
              onClick={() => {
                setPaymentTerms("");
                setShowPaymentDialog(true);
              }}
            >
              Review & Create
            </Button>
          </div>
        </>
      ) : (
        <>
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
              pageSize={PAGE_SIZE}
              onPageChange={loadPackages}
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

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Transfer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Creating this transfer will automatically create a Purchase Order for this supplier.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Payment Terms</label>
            <Select value={paymentTerms || undefined} onValueChange={(v) => setPaymentTerms(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent>
                {["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "50% Upfront"].map((term) => (
                  <SelectItem key={term} value={term}>
                    {term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Back
            </Button>
            <Button
              disabled={!paymentTerms || submitting}
              onClick={() => {
                setShowPaymentDialog(false);
                handleCreateIncoming(paymentTerms);
              }}
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
