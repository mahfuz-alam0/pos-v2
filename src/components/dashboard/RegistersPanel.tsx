"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MonitorSmartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useShop } from "@/context/shop-context";
import { fetchRegistersList } from "@/services/registers/list";
import { enableRegister, disableRegister } from "@/services/registers/toggleRegister";

export default function RegistersPanel() {
  const { shopId } = useShop();
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRegisters = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchRegistersList(shopId);
      setRegisters(res?.data?.data?.registers || []);
    } catch (err) {
      console.error("Error fetching registers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleToggle = async (register) => {
    const body = { shopId, id: register.id, version: register.version };
    try {
      if (register.isOpen) {
        await disableRegister(body);
      } else {
        await enableRegister(body);
      }
      fetchRegisters();
    } catch (err) {
      console.error("Failed to toggle register:", err);
    }
  };

  const openCount = registers.filter((r) => r.isOpen).length;

  return (
    <div className="flex h-full flex-col rounded-2xl bg-component-bg shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="size-4.5 text-primary" />
          <h2 className="m-0 text-[15px] font-semibold text-heading">Registers</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-alt px-1.5 text-[11px] font-bold text-primary">
            {openCount}/{registers.length}
          </span>
        </div>
        <Link
          href="/cash-management/registers"
          className="flex h-8 items-center gap-0.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-alt hover:text-text"
        >
          Manage <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex-1 px-5 pt-1 pb-3">
        {loading ? (
          <div className="flex w-full items-center justify-center py-8 text-sm text-muted-foreground">Loading…</div>
        ) : registers.length === 0 ? (
          <div className="flex w-full items-center justify-center py-8 text-sm text-muted-foreground">No Data Found</div>
        ) : (
          <div className="flex flex-col gap-2">
            {registers.map((register) => {
              const isOpen = Boolean(register.isOpen);
              return (
                <div
                  key={register.id}
                  className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-border bg-component-bg px-2.5 py-2 transition-colors ${
                    isOpen ? "hover:bg-surface-alt/50" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${isOpen ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
                    />
                    <span className="truncate text-[12px] font-medium text-text">{register.name}</span>
                  </span>

                  <Switch
                    checked={isOpen}
                    onCheckedChange={() => handleToggle(register)}
                    aria-label={`${isOpen ? "Close" : "Open"} register ${register.name}`}
                  />

                  <Link
                    href={`/pos/drawers?registerId=${register.id}`}
                    aria-label={`Open drawer for ${register.name}`}
                    className="flex size-5.5 shrink-0 items-center justify-center rounded-md bg-surface-alt text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
