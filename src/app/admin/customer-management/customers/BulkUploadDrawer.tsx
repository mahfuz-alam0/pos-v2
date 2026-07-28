"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";

import { connectToSocket } from "@/lib/socket";
import { validateBulkUploadCustomers, uploadBulkCustomers } from "@/services/customers/bulkUpload";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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

const TEMPLATE_COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "streetAddress",
  "city",
  "state",
  "zipCode",
  "country",
  "medicalLicense",
  "medicalLicenseExpiry",
  "drivingLicense",
  "drivingLicenseExpiry",
  "dob",
  "notes",
  "currentPoints",
  "totalPointsEarned",
  "totalPointsSpent",
  "caregiverLicense",
  "customerType",
];

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet([TEMPLATE_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: "" }), {})]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  XLSX.writeFile(wb, "customer_bulk_upload_template.xlsx");
}

export default function BulkUploadDrawer({ open, onClose, onUploaded }: BulkUploadDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    totalRows?: number;
    validRows?: number;
    invalidRows?: number;
    errors?: ValidationError[];
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"processing" | "completed" | "failed" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<ReturnType<typeof connectToSocket>>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setStep("pick");
    setValidating(false);
    setValidationResult(null);
    setUploadProgress(0);
    setUploadErrors([]);
    setUploadStatus(null);
  }, [open]);

  useEffect(() => {
    if (step !== "uploading") return;
    const socket = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/bulk-upload-progress` });
    socketRef.current = socket;

    const handleProgress = (data: any) => {
      setUploadProgress(data.progress || 0);
      setUploadStatus(data.status);
      if (data.status === "completed") {
        if (data.errors?.length) setUploadErrors(data.errors);
        setStep("done");
        onUploaded();
      } else if (data.status === "failed") {
        toast.error(`Upload failed: ${data.errorMessage || "Unknown error"}`);
        if (data.errors) setUploadErrors(data.errors);
        setStep("done");
      }
    };

    socket?.on("bulkUploadProgress", handleProgress);
    return () => {
      socket?.off("bulkUploadProgress", handleProgress);
      socket?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
      const res = await validateBulkUploadCustomers(formData);
      const result = res?.data?.data?.validationResult ?? null;
      setValidationResult(result);
      setStep("validated");
      if (result?.invalidRows > 0) {
        toast.warning(`${result.validRows ?? 0} valid, ${result.invalidRows} invalid. Fix errors before uploading.`);
      } else {
        toast.success(`All ${result?.validRows ?? 0} rows are valid.`);
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
    setUploadProgress(0);
    setUploadErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadBulkCustomers(formData);
      if (!res?.data?.success) {
        toast.error(res?.data?.message || "Upload failed");
        setStep("validated");
      }
      // completion arrives via the bulkUploadProgress socket event
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
      setStep("validated");
    }
  };

  const canUpload = step === "validated" && !!validationResult && (validationResult.validRows ?? 0) > 0 && (validationResult.invalidRows ?? 0) === 0;

  return (
    <Drawer open={open} onClose={step === "uploading" ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-5 py-4">
          <div className="text-base font-semibold leading-tight">Bulk Customer Upload</div>
          <div className="text-xs leading-tight text-muted-foreground">Validate a CSV/Excel file, then upload</div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
            <Download className="size-4" />
            Download Template
          </Button>

          <label
            htmlFor="bulk-upload-customers-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input px-4 py-8 text-center hover:bg-muted/40"
          >
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <div className="text-sm font-medium">{file ? file.name : "Click to choose a file"}</div>
            <div className="text-xs text-muted-foreground">CSV, XLSX or XLS — max 1500 rows</div>
            <input
              id="bulk-upload-customers-file"
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
                  <div className="text-lg font-semibold text-green-600">{validationResult.validRows ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Valid</div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3 text-center">
                  <div className="text-lg font-semibold text-destructive">{validationResult.invalidRows ?? 0}</div>
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
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Uploading customers…</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
                  !uploadErrors.length
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                }`}
              >
                {!uploadErrors.length ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
                {!uploadErrors.length ? "Customers uploaded successfully." : `Upload finished with ${uploadErrors.length} error(s).`}
              </div>

              {uploadErrors.length > 0 && (
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {uploadErrors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs">
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      <div>
                        <span className="font-medium">Row {err.rowNumber ?? "-"}</span>
                        <div className="text-destructive">{err.error || err.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
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
                  Upload {validationResult?.validRows ?? ""} Customers
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
