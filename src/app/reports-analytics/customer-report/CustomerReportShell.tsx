"use client";

import { useState } from "react";
import { User, FileText, Users, UsersRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import CustomerActivityListTable from "./CustomerActivityListTable";
import CustomerPurchaseHistoryTable from "./CustomerPurchaseHistoryTable";
import CustomerQueueTable from "./CustomerQueueTable";
import NewCustomersTable from "./NewCustomersTable";

const REPORTS = [
  {
    key: "activity",
    title: "Customer Activity List",
    description:
      "View a list of customer contact information based on the days since their last visit. This is a great resource to identify customers that you might want to incentivize to maintain your customer base.",
    icon: User,
    color: "#1890ff",
  },
  {
    key: "purchase-history",
    title: "Customer Purchase History",
    description:
      "View product sales by customer. You can view details like pricing groups, classifications, and brands. You can also filter an individual customer to see all of their purchase history.",
    icon: FileText,
    color: "#52c41a",
  },
  {
    key: "queue",
    title: "Customer Queue",
    description: "View your average customer queue, by location.",
    icon: Users,
    color: "#faad14",
  },
  {
    key: "new-customers",
    title: "New Customers",
    description:
      "View new customers for a specified date range to make sure their information is complete and being captured accurately.",
    icon: UsersRound,
    color: "#722ed1",
  },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];

export default function CustomerReportShell() {
  const [active, setActive] = useState<ReportKey>("activity");
  const current = REPORTS.find((r) => r.key === active) ?? REPORTS[0];
  const Icon = current.icon;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="gap-1 p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Customer Reports</h1>
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

        {active === "activity" && <CustomerActivityListTable />}
        {active === "purchase-history" && <CustomerPurchaseHistoryTable />}
        {active === "queue" && <CustomerQueueTable />}
        {active === "new-customers" && <NewCustomersTable />}
      </Card>
    </div>
  );
}
