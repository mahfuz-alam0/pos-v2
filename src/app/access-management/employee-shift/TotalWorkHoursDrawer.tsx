"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchAccessControlledEmployees } from "@/services/employees/listAccessControlled";
import { getEmployeeTotalWorkHours } from "@/services/employees/shift/totalWorkHours";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Total Work Hours</div>
            <div className="text-xs leading-tight text-muted-foreground">Sum logged hours over a date range</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <label className="flex items-center justify-between text-sm">
              <span>All Employees</span>
              <Switch checked={allEmployees} onCheckedChange={setAllEmployees} />
            </label>

            {!allEmployees && (
              <Field label="Employee" required>
                <Select
                  items={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
                  value={employeeId}
                  onValueChange={(v) => setEmployeeId(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select employee" />
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
              <Field label="Start Date" className="flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                />
              </Field>
              <Field label="End Date" className="flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                />
              </Field>
            </div>

            <Button onClick={handleFetch} disabled={loading}>
              {loading ? "Loading..." : "Get Total Hours"}
            </Button>

            {results.length > 0 && (
              <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
                <Table>
                  <TableHeader className="[&_tr]:border-b-0">
                    <TableRow className="bg-muted/60">
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.id} className="border-b-0">
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="text-right font-mono">{r.hours}h {r.minutes}m</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
