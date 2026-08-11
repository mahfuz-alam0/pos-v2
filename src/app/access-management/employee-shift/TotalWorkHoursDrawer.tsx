"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchAccessControlledEmployees } from "@/services/employees/listAccessControlled";
import { getEmployeeTotalWorkHours } from "@/services/employees/shift/totalWorkHours";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function TotalWorkHoursDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { shopId } = useShop();
  const [allEmployees, setAllEmployees] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState(toISODate(new Date(new Date().setDate(new Date().getDate() - 30))));
  const [endDate, setEndDate] = useState(toISODate(new Date()));
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: string; name: string; hours: number; minutes: number }[]>([]);
  const totalHours = results.reduce((sum, r) => sum + r.hours, 0);
  const totalMinutes = results.reduce((sum, r) => sum + r.minutes, 0);

  useEffect(() => {
    if (!open) return;
    fetchAccessControlledEmployees(100, 1).then((res) => setEmployees(res?.data?.employees ?? []));
  }, [open]);

  const handleFetch = async () => {
    if (!shopId) return;
    if (!allEmployees && !employeeId) {
      toast.error("Please select an employee");
      return;
    }

    setLoading(true);
    try {
      const targets = allEmployees ? employees : employees.filter((e) => e.id === employeeId);
      const res = await Promise.all(
        targets.map((e) =>
          getEmployeeTotalWorkHours({ employeeId: e.id, startDate, endDate, shopId: shopId as string }).then((r) => ({
            id: e.id,
            name: e.name,
            hours: r?.data?.totalHoursLogged ?? 0,
            minutes: r?.data?.totalMinutesLogged ?? 0,
          }))
        )
      );
      setResults(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch work hours");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold">Work Hours</div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex">
              <button
                type="button"
                onClick={() => setAllEmployees(false)}
                className={`flex-1 rounded-l-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  !allEmployees ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"
                }`}
              >
                Single Employee
              </button>
              <button
                type="button"
                onClick={() => setAllEmployees(true)}
                className={`-ml-px flex-1 rounded-r-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  allEmployees ? "relative z-10 border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"
                }`}
              >
                All Employees
              </button>
            </div>

            {!allEmployees && (
              <Field label="Employee" required>
                <Select
                  items={[{ value: "", label: "Select Employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
                  value={employeeId}
                  onValueChange={(v) => setEmployeeId(v as string)}
                >
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="flex gap-3">
              <Field label="From" required className="flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                />
              </Field>
              <Field label="To" required className="flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                />
              </Field>
            </div>

            <Button className="h-10! rounded-lg! text-[15px]! font-medium!" onClick={handleFetch} disabled={loading}>
              {loading ? "Loading..." : "Get Work Hours"}
            </Button>

            {results.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-5">
                  <span className="text-2xl font-semibold text-blue-500">{totalHours}</span>
                  <span className="text-sm text-muted-foreground">Total Hours</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-5">
                  <span className="text-2xl font-semibold text-green-500">{totalMinutes}</span>
                  <span className="text-sm text-muted-foreground">Total Minutes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
