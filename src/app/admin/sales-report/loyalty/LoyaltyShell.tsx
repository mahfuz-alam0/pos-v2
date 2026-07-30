"use client";

import { useState } from "react";
import { Trophy, DollarSign } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import LoyaltyAdjustmentsTable from "./LoyaltyAdjustmentsTable";
import LoyaltyRedemptionTable from "./LoyaltyRedemptionTable";

const REPORTS = [
  {
    key: "adjustments",
    title: "Loyalty Adjustments",
    description: "View the history of manual adjustments to customer loyalty points.",
    icon: Trophy,
    color: "#faad14",
  },
  {
    key: "redemption",
    title: "Loyalty Redemption Values",
    description: "View the dollar value redeemed from loyalty transactions.",
    icon: DollarSign,
    color: "#52c41a",
  },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];

export default function LoyaltyShell() {
  const [active, setActive] = useState<ReportKey>("adjustments");
  const current = REPORTS.find((r) => r.key === active) ?? REPORTS[0];
  const Icon = current.icon;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="gap-1 p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Loyalty Reports</h1>
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

        {active === "adjustments" && <LoyaltyAdjustmentsTable />}
        {active === "redemption" && <LoyaltyRedemptionTable />}
      </Card>
    </div>
  );
}
