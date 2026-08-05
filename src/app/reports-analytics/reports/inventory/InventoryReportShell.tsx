"use client";

import { useState } from "react";
import { History, Database } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import InventorySnapshot from "./InventorySnapshot";
import InventoryTransactions from "./InventoryTransactions";
import PackageHistory from "./PackageHistory";

const REPORTS = [
  {
    key: "snapshot",
    title: "Inventory Snapshot",
    description:
      "View a snapshot of your inventory with detailed product information including quantities, costs, and estimated retail values for a specified date.",
    icon: History,
    color: "#52c41a",
  },
  {
    key: "transactions",
    title: "Inventory Transactions",
    description:
      "View all inventory transaction details including, adjustments, conversions, room movements, package edits, purchase orders received, sales, refunds, and transfers.",
    icon: Database,
    color: "#1890ff",
  },
  {
    key: "package-history",
    title: "Package History",
    description: "View the history of transactions for a specific package.",
    icon: History,
    color: "#52c41a",
  },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];

export default function InventoryReportShell() {
  const [active, setActive] = useState<ReportKey>("snapshot");
  const current = REPORTS.find((r) => r.key === active) ?? REPORTS[0];
  const Icon = current.icon;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="gap-1 p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Inventory Reports</h1>
            <p className="text-sm text-muted-foreground">{current.description}</p>
          </div>
          <Select
            items={REPORTS.map((r) => ({ value: r.key, label: r.title }))}
            value={active}
            onValueChange={(v) => setActive(v as ReportKey)}
          >
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORTS.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4" style={{ color: current.color }} />
          <span className="text-base font-semibold">{current.title}</span>
        </div>

        {active === "snapshot" && <InventorySnapshot />}
        {active === "transactions" && <InventoryTransactions />}
        {active === "package-history" && <PackageHistory />}
      </Card>
    </div>
  );
}
