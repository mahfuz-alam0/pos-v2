"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Pending orders list. Ported from old app/components/posModule/PendingOrders.js
 * for parity. It was a dead import in the old POS page (never rendered) and is
 * NOT wired into the new page.js either — confirmed by re-reading the old
 * routes/Pos/index.js (imports PendingOrders but has no <PendingOrders/> in the
 * Tabs). The old component rendered hard-coded mock rows; that behavior is
 * preserved. The old inline InProgressDetail dependency is replaced with a
 * minimal self-contained detail panel since this view was never functional.
 */
export default function PendingOrders() {
  const [details, setDetails] = useState(false);
  const [selected, setSelected] = useState(null);

  const data = Array.from({ length: 20 }, (_, i) => ({
    key: i + 1,
    orderID: "A1-001",
    createdAt: "2021-03-01 12:00:00",
    status: "pending",
    externalID: "65904494856de80064e72161",
  }));

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className={details ? "w-full lg:w-2/3" : "w-full"}>
        <div className="mb-3 max-w-md">
          <Input placeholder="Search Order" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Order ID</th>
                <th className="px-4 py-2 font-medium">Created At</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((record) => (
                <tr key={record.key}>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => {
                        setDetails(true);
                        setSelected(record);
                      }}
                    >
                      {record.orderID}
                    </button>
                  </td>
                  <td className="px-4 py-2">{record.createdAt}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-amber-200 px-3 py-1 text-xs text-black">
                      Pending
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center">
                      <Trash2 className="h-4 w-4 cursor-pointer text-primary" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {details && (
        <div className="w-full rounded-xl border border-border bg-muted/20 p-4 lg:w-1/3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Order Details</h3>
            <button
              type="button"
              className="cursor-pointer"
              onClick={() => setDetails(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Order ID</span>
              <span>{selected?.orderID}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Created At</span>
              <span>{selected?.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Status</span>
              <span>Pending</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">External ID</span>
              <span className="font-mono text-xs">{selected?.externalID}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
