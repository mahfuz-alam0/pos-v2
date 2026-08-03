"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { fetchSingleEmployee } from "@/services/employees/getSingle";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDetailPanel({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchSingleEmployee(employeeId)
      .then((res) => setEmployee(res?.data?.employee ?? res?.data ?? null))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const rows = [
    { label: "Name", value: employee?.name ?? "-" },
    { label: "Email", value: employee?.email ?? "-" },
    { label: "Country", value: employee?.countryCode ?? "-" },
    { label: "Phone", value: employee?.phone ?? "-" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="text-sm font-semibold">Employee Details</div>
        <div className="flex items-center gap-2">
          {employee?.type && <Badge variant={employee.type === "ADMINISTRATION" ? "default" : "secondary"}>{employee.type}</Badge>}
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
          : rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-foreground/5 pb-2">
                <span className="w-2/5 text-muted-foreground">{row.label}</span>
                <span className="w-3/5 text-right font-medium">{row.value}</span>
              </div>
            ))}
      </div>
    </div>
  );
}
