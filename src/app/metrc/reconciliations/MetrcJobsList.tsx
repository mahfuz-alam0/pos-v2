"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export interface MetrcJob {
  id: string | number;
  jobType: "PACKAGE_SYNC" | "SALE_REPORT" | "SALE_RETURN_REPORT" | "BATCH_PACKAGE_UPDATE";
  createdAt: string;
  isError?: boolean;
  isPicked?: boolean;
  jobData?: {
    advertisedSaleId?: string;
    packages?: { metrcId: string; metrcTag: string; adjustedQuantity: number }[];
    employeeSnapshotName?: string;
    employeeSnapshotEmail?: string;
    employeeSnapshotAvatarUrl?: string;
  };
  errorLog?: { Message?: string };
  stringifiedErrorMessages?: string[];
}

function jobHeading(job: MetrcJob) {
  switch (job.jobType) {
    case "PACKAGE_SYNC":
      return "Retrieving latest active package data from METRC";
    case "SALE_REPORT":
      return `Reporting sale to METRC. Sale ID: ${job.jobData?.advertisedSaleId ?? "-"}`;
    case "SALE_RETURN_REPORT":
      return `Reporting sale return to METRC. Return ID: ${job.jobData?.advertisedSaleId ?? "-"}`;
    case "BATCH_PACKAGE_UPDATE":
      return `Package reconciliation with METRC. Total packages: ${job.jobData?.packages?.length ?? 0}`;
    default:
      return job.jobType;
  }
}

interface MetrcJobsListProps {
  jobs: MetrcJob[];
  mode: "queue" | "log";
  onDelete?: (id: string | number) => Promise<void>;
}

export default function MetrcJobsList({ jobs, mode, onDelete }: MetrcJobsListProps) {
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<MetrcJob | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggle = (id: string | number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (jobs.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">No data found.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job, i) => {
        const isOpen = expanded.has(job.id);
        return (
          <div key={job.id} className={`rounded-lg ${i % 2 === 1 ? "bg-table-zebra" : "bg-muted/40"}`}>
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-2">
                {mode === "log" && (
                  <AlertTriangle className={`size-4 ${job.isError ? "text-destructive" : "text-amber-500"}`} />
                )}
                <div>
                  <div className="text-sm font-semibold">{jobHeading(job)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mode === "log" ? (
                  <Badge variant={job.isError ? "destructive" : "outline"} className={job.isError ? "" : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"}>
                    {job.isError ? "Error" : "Warning"}
                  </Badge>
                ) : (
                  <Badge variant={job.isPicked ? "default" : "outline"}>{job.isPicked ? "In Progress" : "Queued"}</Badge>
                )}
                <Button variant="ghost" size="icon" onClick={() => toggle(job.id)}>
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
                {mode === "log" && onDelete && (
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(job)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-foreground/10 p-3">
                {mode === "log" && (
                  <div className="mb-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                    {job.isError ? job.stringifiedErrorMessages?.join(", ") : job.errorLog?.Message}
                  </div>
                )}

                {job.jobData?.employeeSnapshotName && (
                  <div className="mb-3 flex items-center gap-2">
                    {job.jobData.employeeSnapshotAvatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={job.jobData.employeeSnapshotAvatarUrl}
                        alt={job.jobData.employeeSnapshotName}
                        className="size-8 rounded-full"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium">{job.jobData.employeeSnapshotName}</div>
                      <div className="text-xs text-muted-foreground">{job.jobData.employeeSnapshotEmail}</div>
                    </div>
                  </div>
                )}

                {job.jobType === "BATCH_PACKAGE_UPDATE" && job.jobData?.packages && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metrc ID</TableHead>
                        <TableHead>Metrc Tag</TableHead>
                        <TableHead>Adjusted Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {job.jobData.packages.map((p) => (
                        <TableRow key={p.metrcId}>
                          <TableCell>{p.metrcId}</TableCell>
                          <TableCell>{p.metrcTag}</TableCell>
                          <TableCell>{p.adjustedQuantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        );
      })}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
