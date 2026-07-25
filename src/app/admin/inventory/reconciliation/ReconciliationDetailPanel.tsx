"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchPackageAdjustment } from "@/services/packageAdjustments/getSingle";
import { rejectPackageAdjustment } from "@/services/packageAdjustments/reject";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ApprovePackageDialog from "./ApprovePackageDialog";

interface ReconciliationDetailPanelProps {
  adjustmentId: string;
  onClose: () => void;
  onChanged: () => void;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="w-3/5 text-sm text-muted-foreground">{label}</span>
      <span className="w-2/5 truncate text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default function ReconciliationDetailPanel({
  adjustmentId,
  onClose,
  onChanged,
}: ReconciliationDetailPanelProps) {
  const { shopId } = useShop();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchPackageAdjustment(adjustmentId, shopId);
      setDetail(res?.data?.adjustment ?? null);
    } catch (err) {
      toast.error(err?.message || "Failed to load adjustment details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustmentId, shopId]);

  const handleReject = async () => {
    if (!detail) return;
    setRejectLoading(true);
    try {
      await rejectPackageAdjustment({ shopId, id: detail.id });
      toast.success("Package has been rejected successfully");
      onChanged();
    } catch (err) {
      toast.error(err?.message || "Failed to reject package");
    } finally {
      setRejectLoading(false);
    }
  };

  const totalDifference = (detail?.storageLocationBreakdown ?? []).reduce(
    (acc: number, item: any) => acc + item.differenceCount,
    0
  );

  return (
    <Card className="gap-0 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X />
        </Button>
        {detail && !detail.isApproved && !detail.isRejected && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setApproveOpen(true)}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" disabled={rejectLoading} onClick={handleReject}>
              {rejectLoading ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        )}
      </div>

      <h2 className="mb-2 text-base font-semibold">Reconciliation Details</h2>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && detail && (
        <div className="flex flex-col gap-1">
          <Detail label="Total Difference Reported" value={`${totalDifference} ${detail.uoMShortForm ?? "ea"}`} />
          <Detail label="Product Name" value={detail.packageNameSnapShot} />
          <Detail label="Status" value={detail.isApproved ? "Approved" : detail.isRejected ? "Rejected" : "N/A"} />
          <Detail label="Operated By" value={detail.initiatedBy?.name} />
          <Detail label="Package ID" value={detail.advertisedPackageId} />
          <Detail label="Approved By" value={detail.approvedBy?.name ?? "N/A"} />
          <Detail label="Rejected By" value={detail.rejectedBy?.name ?? "N/A"} />
          <Detail label="Created At" value={new Date(detail.createdAt).toLocaleDateString()} />
          <Detail label="Reason" value={detail.initiationReason} />
          <Detail label="Additional Notes" value={detail.additionalNotes} />
          {detail.originSessionId != null && (
            <div className="flex items-center justify-between gap-4 py-1">
              <span className="w-3/5 text-sm text-muted-foreground">Associated Session</span>
              <Link
                href={`/admin/inventory/reconciliation/sessions/details/${detail.originSessionId}`}
                className="w-2/5 truncate text-right text-sm font-medium text-primary hover:underline"
              >
                {detail.originSessionAdvertisedId}
              </Link>
            </div>
          )}

          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Storage Location Name</TableHead>
                <TableHead>Difference Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail.storageLocationBreakdown ?? []).map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.differenceCount} {detail.uoMShortForm ?? "ea"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {detail && (
        <ApprovePackageDialog
          open={approveOpen}
          onOpenChange={setApproveOpen}
          adjustment={detail}
          onApproved={() => {
            setApproveOpen(false);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}
