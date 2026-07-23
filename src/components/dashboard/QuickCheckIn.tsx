"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { searchCustomers } from "@/services/customers/search";
import { addCustomerToQueue } from "@/services/customerQueue/add";

function getAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function QuickCheckIn({ shopId, queueData, onCheckedIn }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!focused) return;
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchCustomers({ shopId, search: query, limit: 20 });
      setResults(res?.data || []);
      setLoading(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, focused, shopId]);

  async function handleCheckIn() {
    if (!selected) return;
    const alreadyInQueue = queueData?.some((q) => q.customerId === selected.id);
    if (alreadyInQueue) {
      toast.info("Customer is already in the queue");
      setSelected(null);
      return;
    }
    setCheckingIn(true);
    try {
      await addCustomerToQueue({ shopId, customerId: selected.id, isAnonymous: false });
      toast.success(`${selected.firstName} checked in!`);
      setSelected(null);
      setQuery("");
      setResults([]);
      onCheckedIn?.();
    } catch (err) {
      toast.error(err?.message || "Failed to check in");
    } finally {
      setCheckingIn(false);
    }
  }

  if (selected) {
    const age = getAge(selected.dob || selected.dateOfBirth);
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-soft px-3.5 py-2.5">
        {selected.avatarUrl ? (
          <img src={selected.avatarUrl} alt="" className="size-9.5 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
            {(selected.firstName || "?")[0].toUpperCase()}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold whitespace-nowrap text-text">
              {selected.firstName} {selected.lastName}
            </span>
            {age && <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-on-primary">{age}</span>}
          </div>
          {selected.customerType && (
            <span className="w-fit rounded-full border border-primary/30 bg-primary-soft px-2 text-[11px] font-medium text-primary">
              {selected.customerType}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="h-8 rounded-md bg-green-600 px-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {checkingIn ? "Checking in…" : "Check In"}
          </button>
          <button
            onClick={() => setSelected(null)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-alt"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Quick check-in — search by name..."
        className="w-full rounded-lg border border-border bg-component-bg px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {focused && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
          {loading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">Loading…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">No customers found</div>
          ) : (
            results.map((customer) => {
              const age = getAge(customer.dob || customer.dateOfBirth);
              const alreadyIn = queueData?.some((q) => q.customerId === customer.id);
              return (
                <button
                  key={customer.id}
                  disabled={alreadyIn}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSelected(customer)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {customer.avatarUrl ? (
                    <img src={customer.avatarUrl} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {(customer.firstName || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                      {customer.firstName} {customer.lastName}
                      {age && <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">{age}</span>}
                      {alreadyIn && <span className="text-[10px] text-muted-foreground">· In queue</span>}
                    </div>
                    {customer.customerType && <div className="text-[11px] text-muted-foreground">{customer.customerType}</div>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
