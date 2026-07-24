"use client";

import { Badge } from "@/components/ui/badge";
import PortPending from "./_PortPending";

/**
 * Customer queue panel (old addCustomerToQueue.js, ~567 lines). The full
 * version adds/edits queue entries via a scan/OCR/AddCustomer flow (deep
 * customer-management sub-tree) — that add form is pending migration. The live
 * queue list itself is rendered here from the `data` prop the page passes.
 *
 * Props: data — the live customer queue array (from useCustomerQueue).
 */
export default function AddCustomerToQueue({ data = [] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          In Queue <Badge className="ml-1">{data?.length || 0}</Badge>
        </h3>
      </div>

      {(!data || data.length === 0) && (
        <p className="text-sm text-muted-foreground">No customers in queue.</p>
      )}

      <ul className="divide-y divide-border rounded-md border border-border">
        {data?.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {c.customerName ||
                  c.name ||
                  `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
                  "Anonymous"}
              </p>
              {c.phoneNumber && (
                <p className="truncate text-muted-foreground">{c.phoneNumber}</p>
              )}
            </div>
            {c.status && <Badge variant="secondary">{c.status}</Badge>}
          </li>
        ))}
      </ul>

      <PortPending
        name="Add-to-queue form"
        detail="The scan / OCR / add-customer entry form is a customer-management sub-tree pending migration. Live queue list above is fully wired."
      />
    </div>
  );
}
