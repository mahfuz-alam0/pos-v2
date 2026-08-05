"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchInventoryPackageHistory } from "@/services/reporting/inventoryPackageHistory";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import PackageHistoryTable from "@/app/reports-analytics/inventory/PackageHistoryTable";
import type { PackageHistoryRow, InventoryPagination } from "@/app/reports-analytics/inventory/types";

const PAGE_SIZE = 20;

export interface PackageOrderHistoryDrawerProps {
  open: boolean;
  packageId: string;
  onClose: () => void;
}

export default function PackageOrderHistoryDrawer({ open, packageId, onClose }: PackageOrderHistoryDrawerProps) {
  const [rows, setRows] = useState<PackageHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<InventoryPagination>({ page: 1, pageSize: PAGE_SIZE, totalEntries: 0, totalPages: 1 });

  const fetchPage = async (page: number) => {
    if (!packageId) return;
    setLoading(true);
    try {
      const res = await fetchInventoryPackageHistory({ packageId, page, limit: PAGE_SIZE });
      setRows(res?.data?.data || []);
      const pd = res?.data?.paginationData;
      setPagination({ page: pd?.currentPage || page, pageSize: PAGE_SIZE, totalEntries: pd?.totalEntries || 0, totalPages: pd?.totalPages || 1 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && packageId) fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packageId]);

  return (
    <Drawer open={open} onClose={onClose} side="right" size={900}>
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Order History</h2>
          <Button variant="outline" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>

        <PackageHistoryTable data={rows} loading={loading} pagination={pagination} onPageChange={fetchPage} />
      </div>
    </Drawer>
  );
}
