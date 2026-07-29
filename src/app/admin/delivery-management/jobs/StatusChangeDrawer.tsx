"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { listSales } from "@/services/sales/listSales";
import { forceMarkSaleAsPaid } from "@/services/sales/forceMarkAsPaid";
import { changeDeliveryJobStatus } from "@/services/deliveryJobs/changeStatus";
import { uploadAnySingleFile } from "@/services/storage/uploadFile";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface StatusChangeDrawerProps {
  open: boolean;
  action: "start" | "complete" | null;
  jobId: string | number | null;
  advertisedSaleId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function FilesUpload({ links, onChange, accept, label }: { links: string[]; onChange: (links: string[]) => void; accept: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const res = await uploadAnySingleFile(file);
          return res?.downloadUrl || res?.url;
        })
      );
      onChange([...links, ...uploaded.filter(Boolean)]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {links.map((link, i) => (
        <div key={i} className="flex items-center justify-between rounded-md px-3 py-2 ring-1 ring-foreground/10">
          <a href={link} target="_blank" rel="noreferrer" className="truncate text-sm text-primary hover:underline">
            {label} {i + 1}
          </a>
          <button type="button" onClick={() => onChange(links.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="flex h-16 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:bg-muted/30"
      >
        <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {uploading ? <Loader2 className="size-4 animate-spin" /> : (
          <>
            <Upload className="size-4" />
            <span className="text-sm">Upload files</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function StatusChangeDrawer({ open, action, jobId, advertisedSaleId, onClose, onSaved }: StatusChangeDrawerProps) {
  const { shopId } = useShop();
  const [files, setFiles] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [saleInfo, setSaleInfo] = useState<any>(null);
  const [saleCheckLoading, setSaleCheckLoading] = useState(false);
  const [markAsPaidLoading, setMarkAsPaidLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setMessage("");
    setSaleInfo(null);

    if (action === "complete" && advertisedSaleId && shopId) {
      setSaleCheckLoading(true);
      listSales([{ name: "advertisedSaleId", value: advertisedSaleId }])
        .then((res) => setSaleInfo(res?.data?.data?.sales?.[0] || null))
        .catch(() => {})
        .finally(() => setSaleCheckLoading(false));
    }
  }, [open, action, advertisedSaleId, shopId]);

  const handleMarkAsPaid = async () => {
    if (!saleInfo?.id || !shopId) return;
    setMarkAsPaidLoading(true);
    try {
      await forceMarkSaleAsPaid(saleInfo.id, shopId);
      setSaleInfo((prev: any) => ({ ...prev, paymentStatus: "PAID_IN_FULL" }));
      toast.success("Order marked as paid");
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as paid");
    } finally {
      setMarkAsPaidLoading(false);
    }
  };

  const handleSave = async () => {
    if (!jobId || !shopId || !action) return;
    setSaving(true);
    try {
      const newStatus = action === "start" ? "IN_PROGRESS" : "COMPLETED";
      await changeDeliveryJobStatus(jobId, {
        shopId,
        status: newStatus,
        initiationDocumentUrls: action === "start" ? files : null,
        completionDocumentUrls: action === "complete" ? files : null,
        additionalMessage: message || null,
      });
      toast.success(action === "start" ? "Job started successfully" : "Job completed successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update job status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="min-w-0 flex-1 text-base font-semibold leading-tight">
            {action === "start" ? "Start Delivery Job" : "Complete Delivery Job"}
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5 flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div>
              <p className="mb-0.5 text-xs text-muted-foreground">Status changing to</p>
              <Badge variant={action === "start" ? "secondary" : "default"}>{action === "start" ? "IN PROGRESS" : "COMPLETED"}</Badge>
            </div>
          </div>

          {action === "complete" && (
            <div className="mb-5">
              {saleCheckLoading ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-4">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Checking payment status...</span>
                </div>
              ) : saleInfo ? (
                saleInfo.paymentStatus === "PAID_IN_FULL" ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                    <Badge>PAID</Badge>
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Order {saleInfo.advertisedId} is fully paid — ${saleInfo.finalPayable?.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Payment Required</p>
                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                          Order {saleInfo.advertisedId} — ${saleInfo.finalPayable?.toFixed(2)} unpaid
                        </p>
                      </div>
                      <Badge variant="secondary">{saleInfo.paymentStatus?.replace(/_/g, " ")}</Badge>
                    </div>
                    <Button size="sm" className="w-full" onClick={handleMarkAsPaid} disabled={markAsPaidLoading}>
                      {markAsPaidLoading ? "Processing..." : "Mark as Paid & Save"}
                    </Button>
                  </div>
                )
              ) : null}
              <div className="mt-4 h-px bg-border" />
            </div>
          )}

          <div className="mb-5">
            <p className="mb-1 text-sm font-medium">
              {action === "start" ? "Initiation Documents" : "Completion Documents"}
              <span className="ml-1 font-normal text-muted-foreground">(proof required)</span>
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {action === "start" ? "Upload photos or documents confirming the job has started." : "Upload photos or documents confirming successful delivery."}
            </p>
            <FilesUpload links={files} onChange={setFiles} accept="image/*,application/pdf" label="File" />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">
              Additional Message<span className="ml-1 font-normal text-muted-foreground">(optional)</span>
            </p>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add any notes about this status change..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
