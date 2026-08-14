"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { fetchSpiffPayouts } from "@/services/spiffs/listPayouts";
import { markSpiffPayoutPaid } from "@/services/spiffs/markPayoutPaid";
import { unmarkSpiffPayoutPaid } from "@/services/spiffs/unmarkPayoutPaid";
import { formatCurrency } from "@/util/dateUtil";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All" },
];

interface SpiffPayoutsTableProps {
  shopId: string | null | undefined;
  startDate: string | null;
  endDate: string | null;
  employeeFilter: string;
}

export default function SpiffPayoutsTable({ shopId, startDate, endDate, employeeFilter }: SpiffPayoutsTableProps) {
  const [status, setStatus] = useState<"all" | "paid" | "unpaid">("unpaid");
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalOwed: number; totalPaid: number; totalOutstanding: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchSpiffPayouts({
        shopId,
        // The payout query has no "all time" fallback of its own — anchor to the same 90-day
        // window SpiffsPage already uses for its "All" date option.
        startDate: startDate ?? (() => {
          const d = new Date();
          d.setDate(d.getDate() - 90);
          return d.toISOString().slice(0, 10);
        })(),
        endDate: endDate ?? new Date().toISOString().slice(0, 10),
        contributorId: employeeFilter || undefined,
        status,
      });
      setRows(res?.data?.rows ?? []);
      setSummary(res?.data?.summary ?? null);
    } catch {
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, employeeFilter, status]);

  const handleMarkPaid = async (row: any) => {
    if (!shopId) return;
    setActioningId(row.id);
    try {
      await markSpiffPayoutPaid({
        shopId,
        campaignId: row.campaignId,
        contributorId: row.contributorId,
        periodStartDate: row.periodStartDate,
        periodEndDate: row.periodEndDate,
      });
      toast.success(`Marked ${formatCurrency(row.amountOwed)} paid to ${row.contributorName}`);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark payout paid");
    } finally {
      setActioningId(null);
    }
  };

  const handleUnmark = async (row: any) => {
    if (!shopId) return;
    setActioningId(row.id);
    try {
      await unmarkSpiffPayoutPaid({
        shopId,
        campaignId: row.campaignId,
        contributorId: row.contributorId,
        periodStartDate: row.periodStartDate,
        periodEndDate: row.periodEndDate,
      });
      toast.success("Payout unmarked");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to unmark payout");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select items={STATUS_OPTIONS} value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-10! w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {summary && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              Owed: <strong>{formatCurrency(summary.totalOwed)}</strong>
            </span>
            <span>
              Paid: <strong className="text-emerald-600">{formatCurrency(summary.totalPaid)}</strong>
            </span>
            <span>
              Outstanding: <strong className="text-destructive">{formatCurrency(summary.totalOutstanding)}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Employee</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
              <TableHead className="text-right">Amount Owed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 && (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b-0">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No payouts in this range.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, i) => {
              const unitLabel = row.goalType === "revenue" ? "" : " units";
              return (
                <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell className="font-medium">{row.contributorName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{row.campaignName}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.scopeType}: {row.scopeTargetName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.periodLabel}</TableCell>
                  <TableCell className="text-right font-mono">
                    {row.goalType === "revenue" ? formatCurrency(row.contributionValue) : row.contributionValue}
                    {unitLabel}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(row.amountOwed)}</TableCell>
                  <TableCell>
                    {row.paid ? (
                      <Badge className="rounded-md border-transparent bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-300">Paid</Badge>
                    ) : (
                      <Badge className="rounded-md border-transparent bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                        Unpaid
                      </Badge>
                    )}
                    {row.paid && row.paidByName && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        by {row.paidByName} · {row.paidAt ? new Date(row.paidAt).toLocaleDateString() : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.paid ? (
                      <Button variant="outline" size="sm" disabled={actioningId === row.id} onClick={() => handleUnmark(row)}>
                        {actioningId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : "Unmark"}
                      </Button>
                    ) : (
                      <Button size="sm" disabled={actioningId === row.id} onClick={() => handleMarkPaid(row)}>
                        {actioningId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : "Mark Paid"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
