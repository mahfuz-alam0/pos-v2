"use client";

import { useState } from "react";

import { OverallActivityLogsPanel } from "@/components/activity-logs/OverallActivityLogsPanel";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mirrors EDomain in the backend (log-archive/domain/types/activity-log.type.ts).
const DOMAINS = [
  "SALES",
  "SALE_RETURNS",
  "CUSTOMER",
  "PACKAGE",
  "INVENTORY",
  "PRODUCT",
  "CATEGORY",
  "BRAND",
  "CLASSIFICATION",
  "METRC",
  "OTHER",
];

const ALL = "all";

export default function ActivityLogPage() {
  const [domain, setDomain] = useState(ALL);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Audit Logs</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">Activity Log</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Select
            items={[{ value: ALL, label: "All Domains" }, ...DOMAINS.map((d) => ({ value: d, label: d.replaceAll("_", " ") }))]}
            value={domain}
            onValueChange={setDomain}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Domains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Domains</SelectItem>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <OverallActivityLogsPanel domain={domain === ALL ? undefined : domain} />
      </div>
    </div>
  );
}
