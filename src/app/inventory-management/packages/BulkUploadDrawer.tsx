"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { validateBulkUploadPackages, uploadBulkPackages } from "@/services/bulkUpload/packages";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BulkUploadDrawerProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

interface ValidationError {
  rowNumber?: number;
  field?: string;
  message?: string;
  value?: any;
}

type Step = "pick" | "validated" | "uploading" | "done";

export default function BulkUploadDrawer({ open, onClose, onUploaded }: BulkUploadDrawerProps) {
  const { shopId } = useShop();

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    totalRows?: number;
    validRowsCount?: number;
    invalidRowsCount?: number;
    errors?: ValidationError[];
  } | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success?: boolean;
    message?: string;
    errors?: ValidationError[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setStep("pick");
    setValidating(false);
    setValidationResult(null);
    setUploadResult(null);
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setValidationResult(null);
    setStep("pick");
  };

  const handleValidate = async () => {
    if (!file) {
      toast.error("Please choose a file first");
      return;
    }
    setValidating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await validateBulkUploadPackages(shopId, formData);
      const result = res?.data?.data?.validationResult ?? res?.data?.data ?? null;
      setValidationResult(result);
      setStep("validated");

      if (result?.invalidRowsCount > 0) {
        toast.warning(
          `${result.validRowsCount ?? 0} valid, ${result.invalidRowsCount} invalid. Fix errors before uploading.`
        );
      } else {
        toast.success(`All ${result?.validRowsCount ?? 0} rows are valid.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStep("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadBulkPackages(shopId, formData);
      const result = res?.data?.data ?? res?.data ?? null;
      setUploadResult(result);
      setStep("done");
      if (result?.errors?.length) {
        toast.warning(`Upload finished with ${result.errors.length} error(s).`);
      } else {
        toast.success("Packages uploaded successfully");
      }
      onUploaded();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
      setStep("validated");
    }
  };

  const canUpload =
    step === "validated" &&
    !!validationResult &&
    (validationResult.validRowsCount ?? 0) > 0 &&
    (validationResult.invalidRowsCount ?? 0) === 0;

  return (
    <Drawer
      open={open}
      onClose={step === "uploading" ? undefined : onClose}
      side="right"
      size={480}
    >
      <div className="flex h-full flex-col">
        <div className="px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold leading-tight">Bulk Upload Packages</div>
          <div className="text-xs text-muted-foreground leading-tight">
            Validate a CSV/Excel file, then upload
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <label
            htmlFor="bulk-upload-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input px-4 py-8 text-center hover:bg-muted/40"
          >
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <div className="text-sm font-medium">
              {file ? file.name : "Click to choose a file"}
            </div>
            <div className="text-xs text-muted-foreground">CSV, XLSX or XLS — max 1500 rows</div>
            <input
              id="bulk-upload-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {validationResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <div className="text-lg font-semibold">{validationResult.totalRows ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/30">
                  <div className="text-lg font-semibold text-green-600">
                    {validationResult.validRowsCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Valid</div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3 text-center">
                  <div className="text-lg font-semibold text-destructive">
                    {validationResult.invalidRowsCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Invalid</div>
                </div>
              </div>

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Validation Errors
                  </div>
                  <div className="max-h-56 space-y-1.5 overflow-y-auto">
                    {validationResult.errors.map((err, i) => (
                      <div key={i} className="rounded-lg bg-destructive/10 p-2 text-xs">
                        <span className="font-medium">Row {err.rowNumber ?? "-"}</span>
                        {err.field && <span className="text-muted-foreground"> · {err.field}</span>}
                        <div className="text-destructive">{err.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <div className="text-sm">Uploading...</div>
            </div>
          )}

          {step === "done" && uploadResult && (
            <div className="space-y-3">
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
                  !uploadResult.errors?.length
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                }`}
              >
                {!uploadResult.errors?.length ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0" />
                )}
                {uploadResult.message ||
                  (!uploadResult.errors?.length
                    ? "Packages uploaded successfully."
                    : `Upload finished with ${uploadResult.errors.length} error(s).`)}
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {uploadResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs">
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      <div>
                        <span className="font-medium">Row {err.rowNumber ?? "-"}</span>
                        <div className="text-destructive">{err.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          {step === "done" ? (
            <Button onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button variant="outline" disabled={step === "uploading"} onClick={onClose}>
                Cancel
              </Button>
              {canUpload ? (
                <Button onClick={handleUpload} disabled={(step as Step) === "uploading"}>
                  <Upload className="size-4" />
                  Upload {validationResult?.validRowsCount ?? ""} Packages
                </Button>
              ) : (
                <Button onClick={handleValidate} disabled={!file || validating}>
                  {validating ? "Validating..." : "Validate"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
