"use client";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import SalesTable from "@/components/admin/SalesTable";

export interface PackageOrderHistoryDrawerProps {
  open: boolean;
  packageId: string;
  onClose: () => void;
  // Match whatever host drawer this is opened from on top of — PackageDetailsPanel
  // is 50vw, InventoryDetailsDrawer (via PackageStorageLocations) is 60%.
  size?: number | string;
}

// Shows the real sales orders that included this package — same fields as
// the main Sales table (Order ID, Customer, Team, Created, Status, Order
// Type, Payment, Reporting, Total, Action), scoped via SalesTable's
// packageId prop instead of duplicating its rendering.
export default function PackageOrderHistoryDrawer({ open, packageId, onClose, size = "50vw" }: PackageOrderHistoryDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} side="right" size={size}>
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Order History</h2>
          <Button variant="outline" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>

        {open && packageId && <SalesTable packageId={packageId} />}
      </div>
    </Drawer>
  );
}
