"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchInventoriesList } from "@/services/inventories/list";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchProductsInSession } from "@/services/liveInventory/productsInSession";
import { fetchProductsInLiveSession } from "@/services/liveInventory/productsInLiveSession";
import { fetchScopedEmployeesPage } from "@/services/employees/paginatedScoped";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { createLiveSession } from "@/services/liveInventory/createSession";
import { updateLiveSession } from "@/services/liveInventory/updateSession";
import { fetchSingleSession } from "@/services/liveInventory/getSingleSession";
import { startLiveSession } from "@/services/liveInventory/startLiveSession";
import { startProductLiveSession } from "@/services/liveInventory/startProductLiveSession";
import { cancelLiveCountSession } from "@/services/liveInventory/cancelLiveCountSession";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
import Drawer from "@/components/ui/Drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import LiveSessionTimer from "./live/LiveSessionTimer";
import SessionPhaseOne from "./live/SessionPhaseOne";

const PAGE_SIZE = 30;

function readUserInfo() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userInfo") ?? "null");
  } catch {
    return null;
  }
}

interface SessionState {
  assignedToId: string;
  associatedProductIds: string[];
  notes: string | null;
  isBlindCount: boolean;
  storageLocationId: string;
  countMethod: "EITHER" | "SCAN" | "MANUAL";
  isManagerApprovalRequired: string;
  isNotLive: boolean;
}

const createInitialState: SessionState = {
  assignedToId: "",
  associatedProductIds: [],
  notes: null,
  isBlindCount: false,
  storageLocationId: "",
  countMethod: "EITHER",
  isManagerApprovalRequired: "no",
  isNotLive: false,
};

async function fetchBrandsPage(page: number, search: string) {
  const res = await fetchBrandsList({ limit: 20, page, search });
  return {
    items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
    totalPages: res?.paginationData?.totalPages ?? 1,
  };
}

async function fetchCategoriesPage(page: number, search: string) {
  const res = await fetchCategoriesList({ limit: 20, page, search });
  return {
    items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
    totalPages: res?.paginationData?.totalPages ?? 1,
  };
}

interface SessionConfigurationStepProps {
  mode: "create" | "edit";
  sessionId?: string;
}

export default function SessionConfigurationStep({ mode, sessionId }: SessionConfigurationStepProps) {
  const router = useRouter();
  const { shopId } = useShop();
  const userInfo = readUserInfo();

  const [storageLocations, setStorageLocations] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState<string | number | null>(null);
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [excludeInSession, setExcludeInSession] = useState(false);

  const [productsInSession, setProductsInSession] = useState<(string | number)[]>([]);
  const [productsInLiveSession, setProductsInLiveSession] = useState<(string | number)[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<(string | number)[]>([]);

  const [sessionState, setSessionState] = useState<SessionState>(createInitialState);
  const [existingAssociatedIds, setExistingAssociatedIds] = useState<(string | number)[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reconcileSingleProduct, setReconcileSingleProduct] = useState(false);
  const [duration, setDuration] = useState(3600000);
  const [saving, setSaving] = useState(false);

  const [countingDrawerOpen, setCountingDrawerOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveSessionData, setLiveSessionData] = useState<any>(null);
  const [countSession, setCountSession] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showReasonColumn, setShowReasonColumn] = useState(false);
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [phaseHandlers, setPhaseHandlers] = useState<{
    handleNextClick: (() => void) | null;
    handleSubmit: (() => void) | null;
    handleBackClick: (() => void) | null;
  }>({ handleNextClick: null, handleSubmit: null, handleBackClick: null });

  // Load session (edit mode)
  useEffect(() => {
    if (mode !== "edit" || !sessionId || !shopId) return;
    fetchSingleSession(sessionId, shopId)
      .then((res) => {
        const session = res?.data?.session;
        if (!session) return;
        const ids = (session.associatedProducts ?? []).map((p: any) => p.id);
        setExistingAssociatedIds(ids);
        setSelectedProductIds(ids);
        setSessionState({
          assignedToId: session.assignedTo?.id ?? "",
          associatedProductIds: ids,
          notes: session.notes ?? null,
          isBlindCount: session.isBlindCount ?? true,
          storageLocationId: session.storageLocation?.id ?? "",
          countMethod: session.countMethod ?? "SCAN",
          isManagerApprovalRequired: session.isManagerApprovalRequired ? "yes" : "no",
          isNotLive: session.isNotLive ?? false,
        });
      })
      .catch(() => toast.error("Failed to fetch session data"));
  }, [mode, sessionId, shopId]);

  useEffect(() => {
    if (!shopId) return;
    fetchStorageLocations(shopId)
      .then((res) => setStorageLocations(res?.data?.data?.locations ?? []))
      .catch(() => {});
  }, [shopId]);

  const loadProductsInSession = useCallback(async () => {
    if (!shopId) return;
    try {
      const params: Record<string, any> = {};
      if (mode === "edit" && sessionId) params.excludeSessionId = sessionId;
      const res = await fetchProductsInSession(shopId, params);
      setProductsInSession(res?.data?.productIds ?? []);
    } catch {
      /* non-critical */
    }
  }, [shopId, mode, sessionId]);

  const loadProductsInLiveSession = useCallback(async () => {
    if (!shopId || mode === "edit") return;
    try {
      const res = await fetchProductsInLiveSession(shopId, {});
      setProductsInLiveSession(res?.data ?? []);
    } catch {
      /* non-critical */
    }
  }, [shopId, mode]);

  const loadProducts = useCallback(
    async (targetPage = 1) => {
      if (!shopId || !sessionState.storageLocationId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = {
          limit: PAGE_SIZE,
          page: targetPage,
          storageLocationId: sessionState.storageLocationId,
        };
        if (search) params.search = search;
        if (categoryId) params.categoryIds = [categoryId];
        if (brandId) params.brandIds = [brandId];
        if (excludeInSession) params.excludeProductIds = productsInSession.map(String);
        if (mode === "create") params.isNotLive = sessionState.isNotLive;

        const res = await fetchInventoriesList(shopId, params);
        const inventories = res?.data?.data?.inventories ?? [];
        const paginationData = res?.data?.data?.paginationData;
        setRows(inventories);
        setPage(paginationData?.currentPage ?? targetPage);
        setTotalPages(paginationData?.totalPages ?? 1);
        setTotalEntries(paginationData?.totalEntries ?? 0);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    [shopId, sessionState.storageLocationId, sessionState.isNotLive, search, categoryId, brandId, excludeInSession, productsInSession, mode]
  );

  useEffect(() => {
    loadProductsInSession();
    loadProductsInLiveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    loadProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.storageLocationId, sessionState.isNotLive]);

  const toggleProduct = (productId: string | number, checked: boolean) => {
    setSelectedProductIds((prev) => {
      const next = checked ? [...prev, productId] : prev.filter((id) => id !== productId);
      if (!checked && next.length > 50) return prev;
      setSessionState((s) => ({ ...s, associatedProductIds: next.map(String) }));
      return next;
    });
  };

  const isRowDisabled = (productId: string | number) => productsInSession.includes(productId);
  const isRowChecked = (productId: string | number) =>
    selectedProductIds.includes(productId) || productsInSession.includes(productId);

  const validate = (requireAssignee: boolean) => {
    if (requireAssignee && !sessionState.assignedToId) {
      toast.error("Assigned To is required");
      return false;
    }
    if (!sessionState.associatedProductIds[0]) {
      toast.error("At least one product is required");
      return false;
    }
    if (!sessionState.storageLocationId) {
      toast.error("Storage Location is required");
      return false;
    }
    if (!sessionState.countMethod) {
      toast.error("Count Method is required");
      return false;
    }
    return true;
  };

  const handleCreateOrUpdate = async () => {
    if (!validate(true)) return;
    setSaving(true);
    try {
      const body = {
        ...sessionState,
        isManagerApprovalRequired: sessionState.isManagerApprovalRequired === "yes",
        shopId,
      };
      if (mode === "edit") {
        await updateLiveSession({ ...body, id: sessionId });
        toast.success("Session updated successfully!");
      } else {
        await createLiveSession(body);
        toast.success("Session created successfully!");
      }
      setDrawerOpen(false);
      router.push("/admin/inventory/reconciliation?tab=audit");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleStartLiveSession = async () => {
    if (!validate(false)) return;
    if (!duration) {
      toast.error("Duration is required");
      return;
    }
    setSaving(true);
    try {
      const created = await createLiveSession({
        ...sessionState,
        assignedToId: userInfo?.id,
        isManagerApprovalRequired: false,
        shopId,
      });
      const newSessionId = created?.data?.data?.sessionId;
      if (!newSessionId) {
        toast.error("Session ID is missing in the response.");
        return;
      }
      const startRes = await startLiveSession({ shopId, id: newSessionId });
      if (!startRes?.data?.success) {
        toast.error(startRes?.data?.data?.message || "Failed to start live count session.");
        return;
      }
      const startProductRes = await startProductLiveSession({
        shopId,
        sessionId: newSessionId,
        productId: sessionState.associatedProductIds[0],
        approximateTimeToFinishInMS: duration,
      });
      if (!startProductRes?.data?.success) {
        toast.error(startProductRes?.data?.data?.message || "Failed to start product live count session.");
        return;
      }
      toast.success("Session created successfully!");
      const singleRes = await fetchSingleSession(newSessionId, shopId);
      setLiveSessionData(singleRes?.data?.session ?? null);
      setLiveSessionId(newSessionId);
      setCountSession(true);
      setCountingDrawerOpen(true);
      setDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelLiveSession = async () => {
    if (!liveSessionId) return;
    setCancelLoading(true);
    try {
      await cancelLiveCountSession({ shopId, sessionId: liveSessionId });
      toast.success("Live count session cancelled successfully");
      setCountSession(false);
      setCountingDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">{mode === "edit" ? "Update Session" : "Start Session"}</h1>

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Storage Location
          </span>
          <Select
            value={sessionState.storageLocationId}
            onValueChange={(v) => setSessionState((s) => ({ ...s, storageLocationId: v }))}
          >
            <SelectTrigger className="w-55">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {storageLocations.map((loc: any) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button disabled={selectedProductIds.length === 0} onClick={() => setDrawerOpen(true)}>
          {mode === "edit" ? "Update Session" : "Assign"}
          {selectedProductIds.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedProductIds.length}
            </Badge>
          )}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-3">
          <span className="text-sm font-semibold">Select Products</span>
          {totalEntries > 0 && (
            <Badge variant="secondary">{totalEntries} total</Badge>
          )}
          <Input
            placeholder="Search product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadProducts(1)}
            className="ml-2 w-55"
          />
          <ApiSelect
            placeholder="Select Category"
            value={categoryId}
            onChange={(id, opt) => {
              setCategoryId(id);
              setCategoryName(opt?.name ?? null);
            }}
            fetchPage={fetchCategoriesPage}
          />
          <ApiSelect
            placeholder="Select Brand"
            value={brandId}
            onChange={(id, opt) => {
              setBrandId(id);
              setBrandName(opt?.name ?? null);
            }}
            fetchPage={fetchBrandsPage}
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setCategoryId(null);
              setBrandId(null);
              setCategoryName(null);
              setBrandName(null);
              loadProducts(1);
            }}
          >
            Reset
          </Button>
          <label className="ml-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={excludeInSession} onCheckedChange={(c) => setExcludeInSession(!!c)} />
            Filter out products in session
          </label>

          {(categoryName || brandName) && (
            <div className="flex w-full flex-wrap gap-2">
              {categoryName && (
                <Badge variant="secondary" className="gap-1">
                  Category: {categoryName}
                  <X className="size-3 cursor-pointer" onClick={() => { setCategoryId(null); setCategoryName(null); }} />
                </Badge>
              )}
              {brandName && (
                <Badge variant="secondary" className="gap-1">
                  Brand: {brandName}
                  <X className="size-3 cursor-pointer" onClick={() => { setBrandId(null); setBrandName(null); }} />
                </Badge>
              )}
            </div>
          )}
        </div>

        {!sessionState.storageLocationId ? (
          <div className="flex h-48 items-center justify-center bg-background text-center text-muted-foreground">
            <div>
              <p className="mb-1 text-base font-medium">No storage location selected</p>
              <p className="text-sm">Choose a location above to view available products</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b-0 bg-muted/60">
                <TableHead className="w-8" />
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-center">Remaining Qty</TableHead>
                <TableHead className="text-center">In Progress</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((row: any) => {
                  const disabled = isRowDisabled(row.productId);
                  const inLiveSession = productsInLiveSession.includes(row.productId);
                  const alreadyAssociated = existingAssociatedIds.includes(row.productId);
                  return (
                    <TableRow key={row.productId} className="border-b-0">
                      <TableCell>
                        <Checkbox
                          checked={isRowChecked(row.productId)}
                          disabled={disabled}
                          onCheckedChange={(c) => toggleProduct(row.productId, !!c)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell>{row.category?.name ?? "-"}</TableCell>
                      <TableCell>{row.brand?.name ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        {row.targetStorageLocationQty ?? "-"} {row.sellableUoMShortForm ?? ""}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block size-2.5 rounded-full ${inLiveSession ? "bg-red-500" : "bg-muted-foreground/40"}`}
                          title={inLiveSession ? "Product is in live session" : "Product is not in live session"}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled && !alreadyAssociated}
                          onClick={() => {
                            setSessionState((s) => ({ ...s, associatedProductIds: [String(row.productId)] }));
                            setSelectedProductIds([row.productId]);
                            setReconcileSingleProduct(mode === "create");
                            setDrawerOpen(true);
                          }}
                        >
                          {alreadyAssociated ? "Update" : "Reconcile"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </div>

      {sessionState.storageLocationId && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          pageSize={PAGE_SIZE}
          loading={loading}
          onPageChange={loadProducts}
        />
      )}

      {/* Assign / Start Session drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="right" size={400}>
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
          <h2 className="text-base font-semibold">
            {mode === "edit" ? "Update Session Configuration" : reconcileSingleProduct ? "Start Count Session" : "Assign To"}
          </h2>

          {!(mode === "create" && reconcileSingleProduct) && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Employee</label>
              <ApiSelect
                placeholder="Select Employee"
                value={sessionState.assignedToId || null}
                onChange={(id) => setSessionState((s) => ({ ...s, assignedToId: String(id ?? "") }))}
                fetchPage={fetchScopedEmployeesPage}
                className="w-full"
                triggerClassName="w-full"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Will this be a Blind Count?</label>
            <Select
              value={String(sessionState.isBlindCount)}
              onValueChange={(v) => setSessionState((s) => ({ ...s, isBlindCount: v === "true" }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Blind count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "create" && !reconcileSingleProduct && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Does this require manager approval?</label>
              <Select
                value={sessionState.isManagerApprovalRequired}
                onValueChange={(v) => setSessionState((s) => ({ ...s, isManagerApprovalRequired: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Requires Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "edit" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Does this require manager approval?</label>
              <Select
                value={sessionState.isManagerApprovalRequired}
                onValueChange={(v) => setSessionState((s) => ({ ...s, isManagerApprovalRequired: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Requires Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">How should they perform the count</label>
            <Select
              value={sessionState.countMethod}
              onValueChange={(v) => setSessionState((s) => ({ ...s, countMethod: v as SessionState["countMethod"] }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Count Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EITHER">Either</SelectItem>
                <SelectItem value="SCAN">Scan</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "create" && !reconcileSingleProduct && (
            <label className="flex items-center gap-2">
              <Checkbox
                checked={sessionState.isNotLive}
                onCheckedChange={(c) => setSessionState((s) => ({ ...s, isNotLive: !!c }))}
              />
              <span className="text-sm font-medium">Track Inventories (Live inventory Reconciliation)</span>
            </label>
          )}

          {mode === "create" && reconcileSingleProduct && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Duration</label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((hour) => (
                    <SelectItem key={hour} value={String(hour * 3600000)}>
                      {hour} hour(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-auto border-t pt-4">
            <Button
              className="w-full"
              size="lg"
              disabled={saving}
              onClick={mode === "create" && reconcileSingleProduct ? handleStartLiveSession : handleCreateOrUpdate}
            >
              {saving
                ? mode === "edit"
                  ? "Updating Session..."
                  : reconcileSingleProduct
                    ? "Starting Live Session..."
                    : "Creating Session..."
                : mode === "edit"
                  ? "Update Session"
                  : reconcileSingleProduct
                    ? "Start Live Session"
                    : "Create Session"}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Live counting session drawer */}
      {mode === "create" && (
        <Drawer open={countingDrawerOpen} onClose={() => setCountingDrawerOpen(false)} side="right" size={900}>
          <div className="flex h-full flex-col gap-3 p-4">
            {liveSessionId && (
              <div className="rounded bg-muted/40 p-2 text-center">
                <span className="text-xs text-muted-foreground">Session Time</span>
                <div className="font-mono text-lg">
                  <LiveSessionTimer sessionId={liveSessionId} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto rounded-lg border p-2">
              <SessionPhaseOne
                sessionData={liveSessionData}
                setSessionData={setLiveSessionData}
                sessionId={liveSessionId}
                countSession={countSession}
                setCountSession={setCountSession}
                setVisible={setCountingDrawerOpen}
                onButtonStatesChange={(states) => {
                  setShowReasonColumn(states.showReasonColumn);
                  setPhaseSaving(states.isSaving);
                }}
                onButtonHandlersChange={setPhaseHandlers}
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <Button variant="destructive" disabled={cancelLoading} onClick={handleCancelLiveSession}>
                {cancelLoading ? "Cancelling..." : "Cancel Live Session"}
              </Button>
              {countSession ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => phaseHandlers.handleBackClick?.()}>
                    Back
                  </Button>
                  {!showReasonColumn ? (
                    <Button disabled={phaseSaving} onClick={() => phaseHandlers.handleNextClick?.()}>
                      {phaseSaving ? "Saving..." : "Next"}
                    </Button>
                  ) : (
                    <Button onClick={() => phaseHandlers.handleSubmit?.()}>Submit Session</Button>
                  )}
                </div>
              ) : (
                <Button onClick={() => setCountingDrawerOpen(false)}>Close</Button>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
