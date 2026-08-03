"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchAuditSession } from "@/services/auditSessions/getSingle";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Drawer from "@/components/ui/Drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ApproveAndReconcileDialog from "./ApproveAndReconcileDialog";

interface AuditSessionDetailDrawerProps {
  sessionId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

function sumQty(events: any[] = []) {
  return events.reduce((s, e) => s + (e.qty || 0), 0);
}

export default function AuditSessionDetailDrawer({
  sessionId,
  onClose,
  onChanged,
}: AuditSessionDetailDrawerProps) {
  const { shopId } = useShop();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);

  const load = async () => {
    if (!sessionId || !shopId) return;
    setLoading(true);
    setSession(null);
    try {
      const res = await fetchAuditSession(sessionId, shopId);
      setSession(res?.data?.session ?? null);
    } catch (err) {
      toast.error(err?.message || "Failed to fetch audit session details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) load();
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, shopId]);

  const reviewedIds = [
    ...(session?.approvedPackageIds || []),
    ...(session?.rejectedPackageIds || []),
  ];

  const toggleAll = (checked: boolean) => {
    if (!checked) return setSelectedIds([]);
    const selectable = (session?.packagesData || [])
      .filter((pkg: any) => !reviewedIds.includes(pkg.id))
      .map((pkg: any) => pkg.id);
    setSelectedIds(selectable);
  };

  const toggleOne = (id: string | number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const reviewStatus = (pkgId: string | number) => {
    if ((session?.approvedPackageIds || []).includes(pkgId)) return "Approved";
    if ((session?.rejectedPackageIds || []).includes(pkgId)) return "Rejected";
    return "Pending";
  };

  return (
    <Drawer open={!!sessionId} onClose={onClose} side="right" size={900}>
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
        <h2 className="text-base font-semibold">Audit Session Details</h2>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && session && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
              <span className="text-sm text-green-800 dark:text-green-400">
                {session.employee?.name || session.employee?.email || "-"}
              </span>
              <span className="text-sm text-green-800 dark:text-green-400">
                <strong>Location:</strong> {session.storageLocation?.name || "-"}
              </span>
              <span className="text-sm text-green-800 dark:text-green-400">
                <strong>Started:</strong>{" "}
                {session.startedAtDate ? new Date(session.startedAtDate).toLocaleString() : "-"}
              </span>
              <span className="text-sm text-green-800 dark:text-green-400">
                <strong>Ended:</strong>{" "}
                {session.endedAtDate ? new Date(session.endedAtDate).toLocaleString() : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3.5 py-2.5">
              <span className="text-sm font-semibold">
                {selectedIds.length} package{selectedIds.length === 1 ? "" : "s"} selected for approval
              </span>
              <Button size="sm" disabled={selectedIds.length === 0} onClick={() => setApproveOpen(true)}>
                Approve &amp; Reconcile ({selectedIds.length})
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0 bg-muted/60">
                    <TableHead className="w-8">
                      <Checkbox
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length ===
                            (session.packagesData || []).filter((p: any) => !reviewedIds.includes(p.id)).length
                        }
                        onCheckedChange={(c) => toggleAll(!!c)}
                      />
                    </TableHead>
                    <TableHead className="w-6" />
                    <TableHead>Package ID</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>METRC Tag</TableHead>
                    <TableHead className="text-center">Current Qty</TableHead>
                    <TableHead className="text-center">Counted Qty</TableHead>
                    <TableHead className="text-center">Final Qty</TableHead>
                    <TableHead className="text-center">Review Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(session.packagesData || []).map((pkg: any) => {
                    const salesQty = sumQty(pkg.saleEvents);
                    const returnsQty = sumQty(pkg.saleReturnEvents);
                    const expandable = (pkg.saleEvents || []).length > 0 || (pkg.saleReturnEvents || []).length > 0;
                    const expanded = expandedId === pkg.id;
                    const status = reviewStatus(pkg.id);
                    return (
                      <>
                        <TableRow key={pkg.id} className="border-b-0">
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(pkg.id)}
                              disabled={reviewedIds.includes(pkg.id)}
                              onCheckedChange={(c) => toggleOne(pkg.id, !!c)}
                            />
                          </TableCell>
                          <TableCell>
                            {expandable && (
                              <button onClick={() => setExpandedId(expanded ? null : pkg.id)}>
                                {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{pkg.advertisedId || "—"}</TableCell>
                          <TableCell>{pkg.productName}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{pkg.metrcTag || "—"}</TableCell>
                          <TableCell className="text-center">{pkg.currentQtySnapshot ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{pkg.adjustedQty ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={pkg.finalQty >= 0 ? "default" : "destructive"}>{pkg.finalQty ?? "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={status === "Approved" ? "default" : status === "Rejected" ? "destructive" : "secondary"}
                            >
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow key={`${pkg.id}-expand`} className="border-b-0 bg-muted/20">
                            <TableCell colSpan={9}>
                              <div className="flex gap-10 px-2 py-2 text-xs">
                                <div>
                                  <div className="mb-1 font-semibold uppercase text-muted-foreground">Sales</div>
                                  {(pkg.saleEvents || []).length === 0 ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      {pkg.saleEvents.map((e: any, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                          <span className="font-mono">{e.advertisedId || e.saleId || `#${i + 1}`}</span>
                                          <Badge variant="secondary">qty: {e.qty}</Badge>
                                        </div>
                                      ))}
                                      <div className="mt-0.5 text-muted-foreground">
                                        Total: <strong>{salesQty}</strong>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="mb-1 font-semibold uppercase text-muted-foreground">Returns</div>
                                  {(pkg.saleReturnEvents || []).length === 0 ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      {pkg.saleReturnEvents.map((e: any, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                          <span className="font-mono">{e.advertisedId || e.saleReturnId || `#${i + 1}`}</span>
                                          <Badge variant="secondary">qty: {e.qty}</Badge>
                                        </div>
                                      ))}
                                      <div className="mt-0.5 text-muted-foreground">
                                        Total: <strong>{returnsQty}</strong>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!loading && !session && sessionId && (
          <div className="py-10 text-center text-muted-foreground">No data found.</div>
        )}
      </div>

      {session && (
        <ApproveAndReconcileDialog
          open={approveOpen}
          onOpenChange={setApproveOpen}
          session={session}
          selectedPackageIds={selectedIds}
          onDone={() => {
            setApproveOpen(false);
            setSelectedIds([]);
            load();
            onChanged();
          }}
        />
      )}
    </Drawer>
  );
}
