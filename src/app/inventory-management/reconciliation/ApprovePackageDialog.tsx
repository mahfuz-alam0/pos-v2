"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchMetrcAdjustmentReasons } from "@/services/metrc/adjustmentReasons";
import { approvePackageAdjustment } from "@/services/packageAdjustments/approve";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApprovePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: any;
  onApproved: () => void;
}

export default function ApprovePackageDialog({
  open,
  onOpenChange,
  adjustment,
  onApproved,
}: ApprovePackageDialogProps) {
  const { shopId } = useShop();
  const usesMetrcReason = adjustment?.initiationReasonReferenceId !== null;

  const [reasons, setReasons] = useState([]);
  const [reasonText, setReasonText] = useState("");
  const [reasonPlatformId, setReasonPlatformId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasonText(usesMetrcReason ? "" : adjustment?.initiationReason ?? "");
    setReasonPlatformId(adjustment?.initiationReasonReferenceId ?? "");
    if (usesMetrcReason) {
      fetchMetrcAdjustmentReasons(shopId)
        .then((res) => setReasons(res?.data?.reasons ?? []))
        .catch(() => toast.error("Failed to load METRC adjustment reasons"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, adjustment]);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approvePackageAdjustment({
        shopId,
        id: adjustment.id,
        initiationReason: reasonText,
        initiationReasonReferenceId: reasonPlatformId || null,
      });
      toast.success("Package has been approved successfully");
      onApproved();
    } catch (err) {
      toast.error(err?.message || "Failed to approve package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason</DialogTitle>
        </DialogHeader>

        {usesMetrcReason ? (
          <Select
            value={reasonPlatformId}
            onValueChange={(value) => {
              const found = reasons.find((r: any) => r.platformId === value);
              setReasonText(found?.Name ?? "");
              setReasonPlatformId(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((r: any) => (
                <SelectItem key={r.platformId} value={r.platformId}>
                  {r.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Textarea
            rows={4}
            placeholder="Enter your text here"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
          />
        )}

        <div className="flex justify-end">
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? "Approving..." : "Approve"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
