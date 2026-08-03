"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  LayoutGrid,
  BarChart3,
  User,
  MapPin,
  ShoppingCart,
  Percent,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import SalesOverview from "./SalesOverview";
import ItemizedSalesReport from "./ItemizedSalesReport";
import SalesByCategoryReport from "./SalesByCategoryReport";
import SalesByDayReport from "./SalesByDayReport";
import SalesByEmployeeReport from "./SalesByEmployeeReport";
import SalesByLocationReport from "./SalesByLocationReport";
import SalesByProductReport from "./SalesByProductReport";
import SalesDiscountProgressReport from "./SalesDiscountProgressReport";

const REPORTS = [
  {
    key: "overview",
    title: "Sales Overview",
    description: "View a sales snapshot for a date or date range",
    icon: LayoutDashboard,
    color: "#1890ff",
  },
  {
    key: "itemized",
    title: "Itemized Sales",
    description:
      "View a detailed summary of products sold down to the package level. This report can be used for many different operations and further analysis.",
    icon: FileText,
    color: "#722ed1",
  },
  {
    key: "category",
    title: "Sales by Category",
    description:
      "View sales totals by classification for a specified date range. Details include tax types per classification. This report is equivalent to the Sales Summary Report when viewed by classification.",
    icon: LayoutGrid,
    color: "#faad14",
  },
  {
    key: "day",
    title: "Sales by Day",
    description:
      "View sales totals by day for a specified date range. Details include payment methods and tax types per day.",
    icon: BarChart3,
    color: "#13c2c2",
  },
  {
    key: "employee",
    title: "Sales by Employee",
    description:
      "View sales totals by created employee for a specified date range. This report is equivalent to the Sales Summary Report when viewed by employee.",
    icon: User,
    color: "#eb2f96",
  },
  {
    key: "location",
    title: "Sales by Location",
    description:
      "View sales totals by location for a specified date range. This report is equivalent to the Sales Summary Report when viewed by location.",
    icon: MapPin,
    color: "#fa8c16",
  },
  {
    key: "product",
    title: "Sales by Product",
    description:
      "View sales totals by product for a specified date range. This report is equivalent to the Sales Summary Report when viewed by product.",
    icon: ShoppingCart,
    color: "#a0d911",
  },
  {
    key: "discount-progress",
    title: "Sales Discount Progress",
    description:
      "Track high-discount warnings, voids, and refunds, and see which employees or locations are falling short of their sales goals for a specified date range.",
    icon: Percent,
    color: "#f5222d",
  },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];

export default function SalesReportShell() {
  const [active, setActive] = useState<ReportKey>("overview");
  const current = REPORTS.find((r) => r.key === active) ?? REPORTS[0];
  const Icon = current.icon;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="gap-1 p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Sales Reports</h1>
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

        {active === "overview" && <SalesOverview />}
        {active === "itemized" && <ItemizedSalesReport />}
        {active === "category" && <SalesByCategoryReport />}
        {active === "day" && <SalesByDayReport />}
        {active === "employee" && <SalesByEmployeeReport />}
        {active === "location" && <SalesByLocationReport />}
        {active === "product" && <SalesByProductReport />}
        {active === "discount-progress" && <SalesDiscountProgressReport />}
      </Card>
    </div>
  );
}
