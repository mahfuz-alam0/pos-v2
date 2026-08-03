"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { fetchSalesDiscountProgress } from "@/services/reporting/salesDiscountProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SalesDiscountProgress } from "./types";
import { useShop, useShops } from "./salesByShared";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesDiscountProgressReport() {
  const { shopId: defaultShopId } = useShop();
  const shops = useShops();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });
  const [selectedShopId, setSelectedShopId] = useState<string | null>(defaultShopId ?? null);
  const [discountGoalLimitPercent, setDiscountGoalLimitPercent] = useState<number>(15);
  const [employeeSalesGoal, setEmployeeSalesGoal] = useState<number | null>(null);
  const [locationSalesGoal, setLocationSalesGoal] = useState<number | null>(null);

  const [runReport, setRunReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<SalesDiscountProgress | null>(null);

  const startDate = selectedDate.startDate ?? todayStr();
  const endDate = selectedDate.endDate ?? startDate;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        startDate,
        endDate,
        discountGoalLimitPercent: discountGoalLimitPercent ?? 15,
      };
      if (selectedShopId) params.shopId = selectedShopId;
      if (employeeSalesGoal !== null) params.employeeSalesGoal = employeeSalesGoal;
      if (locationSalesGoal !== null) params.locationSalesGoal = locationSalesGoal;

      const res = await fetchSalesDiscountProgress(params);
      setProgress(res?.data ?? null);
      setRunReport(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load sales discount progress");
    } finally {
      setLoading(false);
    }
  };

  const rows = progress
    ? [
        { label: "High Discount Warnings", value: progress.highDiscountWarningCount ?? 0 },
        { label: "Total Voids", value: progress.totalVoids ?? 0 },
        { label: "Total Refunds", value: progress.totalRefunds ?? 0 },
        { label: "Employees Under Sales Goal", value: progress.employeesUnderSalesGoal ?? 0 },
        { label: "Locations Under Sales Goal", value: progress.locationsUnderSalesGoal ?? 0 },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Date Range</div>
          <DateRangeSelector
            setSelectedDate={setSelectedDate}
            initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }}
            showAllOption={false}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Shop</div>
          <Select
            items={[{ value: "__all__", label: "All Shops" }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
            value={selectedShopId ?? "__all__"}
            onValueChange={(v) => setSelectedShopId(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Shops</SelectItem>
              {shops.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Discount Goal Limit %</div>
          <Input
            type="number"
            className="w-62.5"
            value={discountGoalLimitPercent}
            onChange={(e) => setDiscountGoalLimitPercent(Number(e.target.value) || 0)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Employee Sales Goal</div>
          <Input
            type="number"
            className="w-62.5"
            placeholder="Not set"
            value={employeeSalesGoal ?? ""}
            onChange={(e) => setEmployeeSalesGoal(e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Location Sales Goal</div>
          <Input
            type="number"
            className="w-62.5"
            placeholder="Not set"
            value={locationSalesGoal ?? ""}
            onChange={(e) => setLocationSalesGoal(e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 shrink-0" aria-hidden="true" />
          <Button onClick={handleSubmit} disabled={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {runReport && progress && (
        <div className="flex flex-col gap-4">
          {(progress.highDiscountWarningCount ?? 0) > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {progress.highDiscountWarningCount} sale{(progress.highDiscountWarningCount ?? 0) === 1 ? "" : "s"} exceeded
                the {progress.discountGoalLimitPercent ?? discountGoalLimitPercent}% discount goal limit in this date
                range.
              </span>
            </div>
          )}

          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow
                    key={row.label}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                  >
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
