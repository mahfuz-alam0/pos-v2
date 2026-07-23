"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Customer to Queue</DialogTitle>
        </DialogHeader>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name..."
          className="w-full rounded-lg border border-border bg-component-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="mt-3 max-h-96 overflow-y-auto">
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
                  <th className="py-2 text-right font-medium">Action</th>
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
                      <td className="py-2 text-right">
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
      </DialogContent>
    </Dialog>
  );
}
