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
  { key: "orders", href: "/admin/orders", color: "#2A9D8F", icon: FileText, label: "Orders" },
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

        console.log("[AllStatsTiles] settled results:", {
          inventoryStats,
          customersStats,
          tasksStats,
          employeeStats,
          salesStats,
          dealStats,
        });

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
    <div className="flex w-full flex-wrap justify-center gap-4 md:flex-nowrap">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        const value = loading ? "-" : stats[tile.key];
        return (
          <Link href={tile.href} key={tile.key} className="w-[calc(50%-0.5rem)] md:w-1/6">
            <div
              className="flex h-full min-h-23 items-center gap-3 rounded-xl p-4 text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: tile.color, opacity: loading ? 0.6 : 1 }}
            >
              <Icon className="size-8 shrink-0 opacity-90 xl:size-9" />
              <div className="min-w-0">
                <h3 className="m-0 text-sm font-semibold xl:text-2xl">{value}</h3>
                <p className="m-0 text-xs xl:text-sm">{tile.label}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
