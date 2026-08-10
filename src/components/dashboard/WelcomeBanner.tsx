"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, FileText, ShoppingCart } from "lucide-react";
import { fetchTasksList } from "@/services/tasks/list";
import { fetchMyTasksList } from "@/services/tasks/listMyTasks";
import { fetchPendingPreSales } from "@/services/orderAhead/listPresale";
import { fetchAnnouncementsList } from "@/services/announcements/list";
import { useShop } from "@/context/shop-context";
import { useCurrentUser } from "@/util/use-current-user";
import AnnouncementDrawer from "@/components/layout/AnnouncementDrawer";

export default function WelcomeBanner() {
  const { shopId } = useShop();
  const userDetails = useCurrentUser();
  const [taskCount, setTaskCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsDrawerOpen, setAnnouncementsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!shopId) return;

    (async () => {
      try {
        const user = userDetails;
        if (!user) return;

        let fetchFn;
        if (user.type === "SUPER_ADMIN") {
          fetchFn = fetchTasksList;
        } else if (user.type === "ACCESS_CONTROLLED" || user.type === "ADMINISTRATION") {
          fetchFn = fetchMyTasksList;
        } else {
          return;
        }

        const res = await fetchFn(100, 1);
        const allTasks = res?.data?.data?.tasks || [];
        const activeTasks = allTasks.filter((task) => {
          const status = task.taskStatus?.displayName?.toLowerCase() || "";
          return status !== "completed" && status !== "cancelled";
        });
        setTaskCount(activeTasks.length);
      } catch (err) {
        console.error("Error fetching tasks count:", err);
      }
    })();

    (async () => {
      try {
        const res = await fetchPendingPreSales(shopId);
        const preSales = res?.data?.data?.preSales || [];
        setOrderCount(preSales.length);
      } catch (err) {
        console.error("Error fetching pending orders count:", err);
      }
    })();

    (async () => {
      try {
        const res = await fetchAnnouncementsList({ limit: 30, page: 1, includeScheduled: false });
        setAnnouncements(res?.data || []);
      } catch (err) {
        console.error("Error fetching announcements:", err);
      }
    })();
  }, [shopId, userDetails]);

  const shopNow = new Date();
  const dateLabel = `Happy ${shopNow.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const chips: {
    key: string;
    count: number;
    label: string;
    href?: string;
    onClick?: () => void;
    icon: React.ReactNode;
  }[] = [
    {
      key: "tasks",
      count: taskCount,
      label: `Pending task${taskCount !== 1 ? "s" : ""}`,
      href: "/settings/tasks-listings",
      icon: <FileText className="size-4" />,
    },
  ];
  if (orderCount > 0) {
    chips.push({
      key: "orders",
      count: orderCount,
      label: `Order${orderCount !== 1 ? "s" : ""}`,
      href: "/fulfillment/orderahead",
      icon: <ShoppingCart className="size-4" />,
    });
  }
  if (announcements.length > 0) {
    chips.push({
      key: "announcements",
      count: announcements.length,
      label: `Announcement${announcements.length !== 1 ? "s" : ""}`,
      onClick: () => setAnnouncementsDrawerOpen(true),
      icon: <Bell className="size-4" />,
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-linear-to-br from-primary-soft via-surface-alt to-primary-soft px-6 py-5 text-heading">
        <div>
          <div className="text-[22px] font-medium">
            Welcome, <span className="font-semibold">{userDetails?.name || "-"}</span>
          </div>
          <div className="mt-1 text-[13px] font-medium text-muted-foreground">{dateLabel}</div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap justify-end gap-3">
            {chips.map((chip) => {
              const content = (
                <div className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-primary/30 bg-component-bg px-4 py-2">
                  <span className="inline-flex items-center text-[17px] leading-none text-primary">{chip.icon}</span>
                  <span className="text-[16px] font-bold text-heading">{chip.count}</span>
                  <span className="text-sm text-muted-foreground">{chip.label}</span>
                  <span className="ml-0.5 size-2 rounded-full bg-green-500" />
                </div>
              );

              if (chip.href) {
                return (
                  <Link href={chip.href} key={chip.key}>
                    {content}
                  </Link>
                );
              }
              return (
                <div key={chip.key} onClick={chip.onClick}>
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnnouncementDrawer
        open={announcementsDrawerOpen}
        onClose={() => setAnnouncementsDrawerOpen(false)}
      />
    </>
  );
}
