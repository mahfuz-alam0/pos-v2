"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronRight, Inbox, MonitorSmartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useShop } from "@/context/shop-context";
import { fetchRegistersList } from "@/services/registers/list";
import { enableRegister, disableRegister } from "@/services/registers/toggleRegister";
import { getAllPaginatedRegisterDrawer } from "@/services/registers/getRegisterDrawer";
import OpenDrawerDrawer from "@/app/pos/drawers/OpenDrawerDrawer";
import CloseDrawerDrawer from "@/app/pos/drawers/CloseDrawerDrawer";

interface RegisterRow {
  id: string;
  name: string;
  isOpen: boolean;
  version: number;
}

interface DrawerRow {
  id: string;
  name: string;
  isOpen: boolean;
  version: number;
  lastOpenedBy?: { name: string } | null;
  lastClosedBy?: { name: string } | null;
}

export default function RegistersPanel() {
  const { shopId } = useShop();
  const [registers, setRegisters] = useState<RegisterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRegister, setSelectedRegister] = useState<RegisterRow | null>(null);
  const [drawers, setDrawers] = useState<DrawerRow[]>([]);
  const [drawersLoading, setDrawersLoading] = useState(false);

  const [startDrawer, setStartDrawer] = useState<DrawerRow | null>(null);
  const [closeDrawer, setCloseDrawer] = useState<DrawerRow | null>(null);

  // Track the active drawer id in state (instead of reading localStorage during render,
  // which breaks server-side rendering and triggers Fast Refresh full reloads).
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDrawerId(localStorage.getItem("drawerId"));
  }, []);

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

  const handleToggle = async (register: RegisterRow) => {
    const body = { shopId, id: register.id, version: register.version };
    try {
      if (register.isOpen) {
        await disableRegister(body);
      } else {
        await enableRegister(body);
      }
      toast.success(`Register ${register.isOpen ? "disabled" : "enabled"} successfully`);
      fetchRegisters();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update register status");
    }
  };

  const openRegisterDrawers = async (register: RegisterRow) => {
    setSelectedRegister(register);
    setDrawersLoading(true);
    try {
      const res = await getAllPaginatedRegisterDrawer(50, 1, register.id);
      setDrawers(res?.data?.drawers || []);
    } catch (err) {
      console.error("Error fetching drawers:", err);
      setDrawers([]);
    } finally {
      setDrawersLoading(false);
    }
  };

  const handleBackToRegisters = () => {
    setSelectedRegister(null);
    setDrawers([]);
  };

  const handleSelectDrawer = (drawer: DrawerRow) => {
    if (!selectedRegister) return;
    localStorage.setItem("registerId", selectedRegister.id);
    localStorage.setItem("registerName", selectedRegister.name);
    localStorage.setItem("drawerId", drawer.id);
    setSelectedDrawerId(drawer.id);
    localStorage.setItem("drawerName", drawer.name);
    window.dispatchEvent(
      new CustomEvent("registerDrawerSelected", {
        detail: {
          registerId: selectedRegister.id,
          registerName: selectedRegister.name,
          drawerId: drawer.id,
          drawerName: drawer.name,
        },
      })
    );
  };

  const refreshDrawers = () => {
    if (selectedRegister) openRegisterDrawers(selectedRegister);
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

      <div className="max-h-100 flex-1 overflow-y-auto px-5 pt-1 pb-3">
        {selectedRegister ? (
          <>
            <button
              onClick={handleBackToRegisters}
              className="mb-2 flex h-8 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-alt hover:text-text"
            >
              <ArrowLeft className="size-3.5" />
              Back to registers
            </button>

            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-surface-alt/60 px-3 py-2">
              <span className="truncate text-[12px] font-semibold text-text">{selectedRegister.name}</span>
              <Badge variant={selectedRegister.isOpen ? "default" : "destructive"}>
                {selectedRegister.isOpen ? "Open" : "Closed"}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5">
              {drawersLoading ? (
                <div className="flex w-full items-center justify-center py-6 text-sm text-muted-foreground">Loading…</div>
              ) : drawers.length === 0 ? (
                <div className="flex w-full items-center justify-center py-6 text-sm text-muted-foreground">No drawers found</div>
              ) : (
                drawers.map((drawer) => {
                  const isOpen = drawer.isOpen === true;
                  return (
                    <div
                      key={drawer.id}
                      className={`flex items-center gap-2 rounded-lg border border-border bg-component-bg px-2.5 py-2 transition-colors ${
                        isOpen ? "cursor-pointer hover:bg-surface-alt/60" : "opacity-70"
                      }`}
                      onClick={() => isOpen && handleSelectDrawer(drawer)}
                      title={isOpen ? "Select this drawer" : "Drawer is closed"}
                    >
                      <Inbox className={`size-3.5 shrink-0 ${isOpen ? "text-muted-foreground" : "text-destructive"}`} />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-text">{drawer.name}</span>

                      {isOpen ? (
                        <>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Open</Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCloseDrawer(drawer);
                            }}
                            className="shrink-0 cursor-pointer rounded-md bg-surface-alt px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
                          >
                            Balance
                          </button>
                        </>
                      ) : (
                        <>
                          <Badge variant="destructive">Closed</Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStartDrawer(drawer);
                            }}
                            className="shrink-0 cursor-pointer rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:brightness-110"
                          >
                            Start
                          </button>
                        </>
                      )}

                      {isOpen && selectedDrawerId === String(drawer.id) && (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {loading ? (
              <div className="flex min-h-[352px] w-full items-center justify-center py-8 text-sm text-muted-foreground">Loading…</div>
            ) : registers.length === 0 ? (
              <div className="flex min-h-[352px] w-full items-center justify-center py-8 text-sm text-muted-foreground">No Data Found</div>
            ) : (
              <div className="flex flex-col gap-2">
                {registers.map((register) => {
                  const isOpen = Boolean(register.isOpen);
                  return (
                    <div
                      key={register.id}
                      className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-border bg-component-bg px-2.5 py-2 transition-colors ${
                        isOpen ? "hover:bg-surface-alt/50" : "opacity-60 hover:opacity-100"
                      }`}
                      onClick={() => openRegisterDrawers(register)}
                      title={`View drawers for ${register.name}`}
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
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${isOpen ? "Close" : "Open"} register ${register.name}`}
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRegisterDrawers(register);
                        }}
                        aria-label={`View drawers for ${register.name}`}
                        title="View drawers"
                        className="flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-md bg-surface-alt text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <OpenDrawerDrawer
        open={!!startDrawer}
        drawer={startDrawer}
        onClose={() => setStartDrawer(null)}
        onDone={refreshDrawers}
      />
      <CloseDrawerDrawer
        open={!!closeDrawer}
        drawer={closeDrawer}
        onClose={() => setCloseDrawer(null)}
        onDone={refreshDrawers}
      />
    </div>
  );
}
