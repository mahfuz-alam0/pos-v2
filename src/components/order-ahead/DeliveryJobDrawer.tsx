"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchDeliveryJobsList } from "@/services/deliveryJobs/list";
import { changeDeliveryJobStatus } from "@/services/deliveryJobs/changeStatus";
import { removeDeliveryJob } from "@/services/deliveryJobs/remove";
import Drawer from "@/components/ui/Drawer";
import JobDetailsPanel from "@/app/delivery-management/jobs/JobDetailsPanel";
import JobFormDrawer from "@/app/delivery-management/jobs/JobFormDrawer";
import StatusChangeDrawer from "@/app/delivery-management/jobs/StatusChangeDrawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeliveryJobDrawerProps {
  open: boolean;
  onClose: () => void;
  advertisedSaleId?: string | null;
}

// Resolves the delivery job tied to an order-ahead sale (the two are only
// linked by advertisedSaleId, not a stored job id) and shows it in the same
// Job Details view used on the Delivery Jobs page, with the same actions.
export default function DeliveryJobDrawer({ open, onClose, advertisedSaleId }: DeliveryJobDrawerProps) {
  const { shopId } = useShop();
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [statusDrawer, setStatusDrawer] = useState<{ action: "start" | "complete" } | null>(null);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissLoading, setDismissLoading] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [failLoading, setFailLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!open || !shopId || !advertisedSaleId) return;
    setLoading(true);
    setNotFound(false);
    setJobId(null);
    fetchDeliveryJobsList(shopId, { page: 1, limit: 1, advertisedSaleId })
      .then((res) => {
        const job = res?.data?.[0];
        if (job) setJobId(job.id);
        else setNotFound(true);
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load delivery job"))
      .finally(() => setLoading(false));
  }, [open, shopId, advertisedSaleId]);

  const refresh = () => setRefreshTick((t) => t + 1);

  const handleDismiss = async () => {
    if (!jobId || !shopId) return;
    setDismissLoading(true);
    try {
      await changeDeliveryJobStatus(jobId, { shopId, status: "DISMISSED" });
      toast.success("Delivery job dismissed successfully");
      setDismissOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to dismiss delivery job");
    } finally {
      setDismissLoading(false);
    }
  };

  const handleMarkAsFailed = async () => {
    if (!jobId || !shopId) return;
    setFailLoading(true);
    try {
      await changeDeliveryJobStatus(jobId, { shopId, status: "FAILED" });
      toast.success("Delivery job marked as failed");
      setFailOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update delivery job status");
    } finally {
      setFailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!jobId || !shopId) return;
    setDeleteLoading(true);
    try {
      await removeDeliveryJob(jobId, shopId);
      toast.success("Delivery job deleted successfully");
      setDeleteOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete delivery job");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} side="right" size={480}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading delivery job…</div>
        ) : notFound ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium">No delivery job found</p>
            <p className="text-xs text-muted-foreground">
              This order is flagged as a delivery job, but no matching job record could be found for sale {advertisedSaleId}.
            </p>
          </div>
        ) : jobId ? (
          <JobDetailsPanel
            jobId={jobId}
            onClose={onClose}
            refreshTick={refreshTick}
            className="h-full w-full rounded-none ring-0"
            onEdit={() => setEditOpen(true)}
            onStart={() => setStatusDrawer({ action: "start" })}
            onComplete={() => setStatusDrawer({ action: "complete" })}
            onDismiss={() => setDismissOpen(true)}
            onMarkFailed={() => setFailOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        ) : null}
      </Drawer>

      <JobFormDrawer
        open={editOpen}
        jobId={jobId}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          refresh();
        }}
      />

      <StatusChangeDrawer
        open={!!statusDrawer}
        action={statusDrawer?.action ?? null}
        jobId={jobId}
        advertisedSaleId={advertisedSaleId ?? null}
        onClose={() => setStatusDrawer(null)}
        onSaved={() => {
          setStatusDrawer(null);
          refresh();
        }}
      />

      <AlertDialog open={dismissOpen} onOpenChange={(o) => !o && !dismissLoading && setDismissOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Delivery Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to dismiss this delivery job? The status will be changed to <strong>DISMISSED</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dismissLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDismiss} disabled={dismissLoading}>
              {dismissLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Yes, Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={failOpen} onOpenChange={(o) => !o && !failLoading && setFailOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Failed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this delivery job as <strong>FAILED</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={failLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleMarkAsFailed} disabled={failLoading}>
              {failLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Yes, Mark as Failed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !o && !deleteLoading && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this delivery job? This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
