"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2, RefreshCw, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchAvailableMetrcEmployees } from "@/services/metrcCommon/availableMetrcEmployees";
import { reportDriverToMetrc } from "@/services/drivers/reportToMetrc";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface MetrcEmployee {
  License?: { Number?: string };
  FullName?: string;
}

interface ReportToMetrcDrawerProps {
  open: boolean;
  driverId: string | number | null;
  description?: string;
  skipLabel?: string;
  onClose: () => void;
  onReported: () => void;
}

export default function ReportToMetrcDrawer({
  open,
  driverId,
  description = "Select a METRC employee to link with this driver for compliance reporting.",
  skipLabel = "Cancel",
  onClose,
  onReported,
}: ReportToMetrcDrawerProps) {
  const { shopId } = useShop();
  const [employees, setEmployees] = useState<MetrcEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [reporting, setReporting] = useState(false);

  const loadEmployees = () => {
    if (!shopId) return;
    setLoading(true);
    fetchAvailableMetrcEmployees(shopId)
      .then((res) => setEmployees(res?.data ?? []))
      .catch(() => toast.error("Failed to load METRC employees"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setSelected(undefined);
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleReport = async () => {
    if (!selected || !driverId || !shopId) {
      toast.error("Please select a METRC employee.");
      return;
    }
    setReporting(true);
    try {
      await reportDriverToMetrc({ shopId, driverId, metrcEmployeeId: selected });
      toast.success("Driver reported to METRC successfully");
      onReported();
    } catch (err: any) {
      toast.error(err?.message || "Failed to report to METRC");
    } finally {
      setReporting(false);
    }
  };

  return (
    <Drawer open={open} onClose={reporting ? undefined : onClose} side="right" size={420}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="min-w-0 flex-1 text-base font-semibold leading-tight">Report Driver to METRC</div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={reporting}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <Link2 className="size-4" />
              </div>
              <div>
                <p className="mb-1 font-semibold">Link METRC Employee</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg ring-1 ring-foreground/10 p-5">
            <p className="mb-2 text-sm font-medium">Select METRC Employee</p>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                items={employees.map((e) => ({ value: e.License?.Number ?? "", label: e.FullName ?? "" }))}
                value={selected}
                onValueChange={setSelected}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">No employees available</div>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.License?.Number} value={emp.License?.Number ?? ""}>
                        <div className="flex flex-col">
                          <span className="font-medium">{emp.FullName}</span>
                          <span className="text-xs text-muted-foreground">{emp.License?.Number}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" className="mt-3 w-full" onClick={loadEmployees} disabled={loading}>
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /> Refresh Employees
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={reporting}>
            {skipLabel}
          </Button>
          <Button onClick={handleReport} disabled={reporting || !selected}>
            {reporting ? "Reporting..." : "Report to METRC"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
