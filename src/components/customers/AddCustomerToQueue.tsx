"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Drawer from "@/components/ui/Drawer";
import { searchCustomers } from "@/services/customers/search";
import { addCustomerToQueue } from "@/services/customerQueue/add";

export default function AddCustomerToQueue({ open, onOpenChange, shopId, queueData, onCheckedIn }) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    searchCustomers({ shopId, search, limit: 30 })
      .then((res) => setCustomers(res?.data || []))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, shopId]);

  async function handleCheckIn(customer) {
    const alreadyIn = queueData?.some((c) => c.customerId === customer.id);
    if (alreadyIn) {
      toast.info("Customer is already in Queue");
      return;
    }
    setCheckingInId(customer.id);
    try {
      await addCustomerToQueue({ shopId, customerId: customer.id, isAnonymous: false });
      toast.success("Customer is Added to Queue");
      onCheckedIn?.();
    } catch (err) {
      toast.error(err?.message || "Failed to add customer to queue");
    } finally {
      setCheckingInId(null);
    }
  }

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} side="right" size={820} className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-heading">Add Customer to Queue</h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="text-sidebar-text hover:text-text"
        >
          ✕
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name..."
          className="w-full rounded-lg border border-border bg-component-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : customers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No customers found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Phone No.</th>
                  <th className="sticky right-0 z-10 w-24 bg-component-bg py-2 text-right font-medium shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.15)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const isInQueue = queueData?.some((c) => c.customerId === customer.id);
                  const isChecking = checkingInId === customer.id;
                  return (
                    <tr key={customer.id} className="border-b border-border last:border-0">
                      <td className="py-2 text-text">
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className="py-2 text-muted-foreground">{customer.email || "-"}</td>
                      <td className="py-2 text-muted-foreground">{customer.phone || "-"}</td>
                      <td className="sticky right-0 z-10 w-24 bg-component-bg py-2 text-right shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.15)]">
                        <button
                          disabled={isInQueue || isChecking}
                          onClick={() => handleCheckIn(customer)}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isInQueue ? "Already in Queue" : isChecking ? "Checking In…" : "Check In"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Drawer>
  );
}
