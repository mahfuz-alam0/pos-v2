"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gem, ListChecks, Users, FileText, UserRound, Tag } from "lucide-react";
import { useShop } from "@/context/shop-context";
import {
  getInventoryStats,
  getCustomersStats,
  getCompletedTasksStats,
  getEmployeeStats,
  getSalesStats,
  getDealsStats,
} from "@/services/stats/dashboard/allStats";

const TILES = [
  { key: "products", href: "/catalog/products", color: "#E76F51", icon: Gem, label: "Products" },
  { key: "tasks", href: "/settings/tasks-listings", color: "#F4A261", icon: ListChecks, label: "Tasks" },
  { key: "employees", href: "/access-management/employee", color: "#E9C46A", icon: Users, label: "Employees" },
  { key: "orders", href: "/fulfillment/orders", color: "#2A9D8F", icon: FileText, label: "Orders" },
  { key: "customers", href: "/customer-management/customers", color: "#287271", icon: UserRound, label: "Customers" },
  { key: "deals", href: "/admin/deals", color: "#264653", icon: Tag, label: "Deals" },
];

export default function AllStatsTiles() {
  const { shopId } = useShop();
  const [stats, setStats] = useState({ products: 0, tasks: 0, employees: 0, orders: 0, customers: 0, deals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inventoryStats, customersStats, tasksStats, employeeStats, salesStats, dealStats] = await Promise.allSettled([
          getInventoryStats(shopId),
          getCustomersStats(shopId),
          getCompletedTasksStats(shopId),
          getEmployeeStats(shopId),
          getSalesStats(shopId),
          getDealsStats(shopId),
        ]);

        const value = (result) => (result.status === "fulfilled" ? (result.value?.data?.data ?? 0) : 0);

        setStats({
          products: value(inventoryStats),
          customers: value(customersStats),
          tasks: value(tasksStats),
          employees: value(employeeStats),
          orders: value(salesStats),
          deals: value(dealStats),
        });
      } catch (err) {
        console.error("Something went wrong while fetching stats", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        const value = loading ? "-" : stats[tile.key];
        return (
          <Link
            href={tile.href}
            key={tile.key}
            className="rounded-2xl bg-component-bg p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${tile.color}1f` }}
              >
                <Icon className="size-5" style={{ color: tile.color }} />
              </div>
              <div className="min-w-0">
                <h3 className="m-0 text-2xl font-bold leading-none text-heading">{value}</h3>
                <p className="m-0 mt-1 text-xs font-medium text-muted-foreground">{tile.label}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
