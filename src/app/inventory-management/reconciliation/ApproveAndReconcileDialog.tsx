"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchMetrcAdjustmentReasons, createMetrcBulkPackageAdjustments } from "@/services/metrc/adjustmentReasons";
import { createPackageAdjustment } from "@/services/packageAdjustments/create";
import { setAuditSessionPackageReview } from "@/services/auditSessions/setPackageReview";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApproveAndReconcileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  selectedPackageIds: (string | number)[];
  onDone: () => void;
}

export default function ApproveAndReconcileDialog({
  open,
  onOpenChange,
  session,
  selectedPackageIds,
  onDone,
}: ApproveAndReconcileDialogProps) {
  const { shopId } = useShop();
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [reportToMetrc, setReportToMetrc] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!open) return;
    fetchMetrcAdjustmentReasons(shopId)
      .then((res) => setReasons(res?.data?.reasons ?? []))
      .catch(() => toast.error("Failed to load METRC adjustment reasons"));
  }, [open]);

  const selectedPackages = (session?.packagesData || []).filter((pkg: any) =>
    selectedPackageIds.includes(pkg.id)
  );

  const handleConfirm = async () => {
    if (!reason || !notes) return;
    const reasonObj: any = reasons.find((r: any) => r.Name === reason);

    setCurrent(0);
    setProcessing(true);
    try {
      for (let i = 0; i < selectedPackages.length; i++) {
        const pkg = selectedPackages[i];
        const differenceCount = (pkg.finalQty ?? 0) - (pkg.currentQtySnapshot ?? 0);

        await createPackageAdjustment({
          shopId,
          additionalNotes: notes,
          initiationReason: reason,
          packageId: pkg.id,
          storageLocationBreakdown: [
            { storageLocationId: session.storageLocationId, differenceCount },
          ],
          shouldApproveRightAway: true,
          initiationReasonReferenceId: reasonObj?.platformId || null,
          originSessionId: null,
        });

        setCurrent(i + 1);
      }

      if (reportToMetrc) {
        const metrcPackages = selectedPackages
          .filter((pkg: any) => pkg.metrcId)
          .map((pkg: any) => ({
            packagePlatformId: pkg.metrcId,
            adjustedQuantity: (pkg.finalQty ?? 0) - (pkg.currentQtySnapshot ?? 0),
            reasonId: reasonObj?.platformId || null,
            notes: null,
          }));

        if (metrcPackages.length > 0) {
          await createMetrcBulkPackageAdjustments({ shopId, packages: metrcPackages });
        }
      }

      await setAuditSessionPackageReview({
        shopId,
        id: session.id,
        approvedPackageIds: [...(session.approvedPackageIds || []), ...selectedPackages.map((p: any) => p.id)],
        rejectedPackageIds: session.rejectedPackageIds || [],
      });

      toast.success("Packages approved and reconciled successfully");
      setReason("");
      setNotes("");
      setReportToMetrc(false);
      onDone();
    } catch (err) {
      toast.error(err?.message || "Failed to approve and reconcile packages");
    } finally {
      setProcessing(false);
      setCurrent(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !processing && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve &amp; Reconcile</DialogTitle>
          <DialogDescription>
            {selectedPackages.length} package{selectedPackages.length === 1 ? "" : "s"} will be adjusted and
            reconciled
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Adjustment Reasons <span className="text-destructive">*</span>
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full" disabled={processing}>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r: any) => (
                  <SelectItem key={r.platformId} value={r.Name}>
                    {r.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Adjustment Notes <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="Adjustment Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={processing}
            />
          </div>

          <label className="flex items-center gap-2">
            <Checkbox checked={reportToMetrc} onCheckedChange={(c) => setReportToMetrc(!!c)} disabled={processing} />
            <span className="text-sm font-semibold">Report to Metrc</span>
          </label>

          {reportToMetrc && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              <div className="font-semibold">Metrc Reporting Enabled</div>
              <div className="text-xs leading-relaxed">
                This adjustment will also be reported to Metrc. Make sure the selected reason and notes are correct
                before completing.
              </div>
            </div>
          )}

          {processing ? (
            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex justify-between text-sm font-semibold">
                <span>Approving packages...</span>
                <span>
                  {current} / {selectedPackages.length}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${Math.round((current / selectedPackages.length) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={!reason || !notes}>
                Approve and Reconcile
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
