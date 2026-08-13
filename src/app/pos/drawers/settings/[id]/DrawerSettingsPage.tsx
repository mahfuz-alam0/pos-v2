"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Wallet } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { getSingleDrawer } from "@/services/registers/getSingleDrawer";
import { getDrawerActiveSummary } from "@/services/registers/getDrawerSummary";
import { fetchTransactionDrawers } from "@/services/transactions/listDrawers";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import OpenDrawerDrawer from "../../OpenDrawerDrawer";
import CloseDrawerDrawer from "../../CloseDrawerDrawer";
import CashMovementDrawer from "../../CashMovementDrawer";
import DrawerTransactionsTable from "../../DrawerTransactionsTable";
import DrawerSessionsTable from "../../DrawerSessionsTable";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

const TAB_LABEL_CLASS =
  "h-auto flex-none -mb-px rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 pb-3 text-sm font-normal text-foreground/70 after:hidden focus-visible:border-b-primary focus-visible:ring-0 focus-visible:outline-none data-active:border-primary";

export default function DrawerSettingsPage({ drawerId }: { drawerId: string }) {
  const router = useRouter();
  const { shopId } = useShop();

  const [drawer, setDrawer] = useState<any>(null);
  const [activeSummary, setActiveSummary] = useState<any>(null);
  const [allDrawers, setAllDrawers] = useState<{ id: string; name: string; isOpen: boolean }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [openDrawerOpen, setOpenDrawerOpen] = useState(false);
  const [closeDrawerOpen, setCloseDrawerOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const loadDrawer = useCallback(async () => {
    const res = await getSingleDrawer(drawerId);
    setDrawer(res?.data?.data?.drawer ?? null);
  }, [drawerId]);

  useEffect(() => {
    loadDrawer();
  }, [loadDrawer]);

  useEffect(() => {
    if (!drawer?.id) return;
    getDrawerActiveSummary(drawer.id).then((res) => setActiveSummary(res?.data?.data ?? null));
  }, [drawer?.id, refreshKey]);

  useEffect(() => {
    if (!shopId) return;
    fetchTransactionDrawers(shopId as string, 100).then((res) => setAllDrawers(res?.data ?? []));
  }, [shopId]);

  const refresh = () => {
    loadDrawer();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Cash Management</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/pos/drawers">Drawers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-primary">Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{drawer?.name ?? "-"}</h1>
            <Badge variant={drawer?.isOpen ? "default" : "destructive"}>{drawer?.isOpen ? "Open" : "Closed"}</Badge>
          </div>

          {allDrawers.length > 0 && (
            <Select
              items={allDrawers.map((d) => ({ value: d.id, label: d.name }))}
              value={drawer?.id ?? ""}
              onValueChange={(v) => router.push(`/pos/drawers/settings/${v}`)}
            >
              <SelectTrigger className="mt-2 h-10! w-56">
                <SelectValue placeholder="Select drawer" />
              </SelectTrigger>
              <SelectContent>
                {allDrawers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${d.isOpen ? "bg-emerald-500" : "bg-destructive"}`} />
                      {d.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
          {drawer?.isOpen ? (
            <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={() => setDepositOpen(true)}>
              Deposit Cash
            </Button>
          ) : (
            <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={() => setOpenDrawerOpen(true)}>
              Start Drawer
            </Button>
          )}
          {drawer && (
            <>
              <Button variant="outline" className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={() => setWithdrawOpen(true)}>
                Withdraw Cash
              </Button>
              <Button variant="outline" className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={() => setCloseDrawerOpen(true)}>
                Balance Drawer (EOD)
              </Button>
            </>
          )}
        </div>
      </div>

      {drawer ? (
        <Tabs defaultValue="current">
          <div className="border-b border-border">
            <TabsList variant="line" className="h-auto gap-7 p-0">
              <TabsTrigger value="current" className={TAB_LABEL_CLASS}>
                Current Transactions
              </TabsTrigger>
              <TabsTrigger value="all" className={TAB_LABEL_CLASS}>
                All Transactions
              </TabsTrigger>
              <TabsTrigger value="sessions" className={TAB_LABEL_CLASS}>
                Drawer Sessions
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="current" className="mt-4 flex flex-col gap-4">
            {drawer.isOpen && activeSummary && (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl ring-1 ring-foreground/10 p-4">
                  <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                    <Banknote className="size-4 text-muted-foreground" /> Cash
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Started With</span><span className="font-mono font-semibold">{money(activeSummary.cashAmountStartedWith)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total In</span><span className="font-mono font-semibold text-emerald-600">{money(activeSummary.totalCashCredit)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Out</span><span className="font-mono font-semibold text-destructive">{money(activeSummary.totalCashDebit)}</span></div>
                </div>
                <div className="rounded-xl ring-1 ring-foreground/10 p-4">
                  <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                    <Wallet className="size-4 text-muted-foreground" /> Virtual
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Started With</span><span className="font-mono font-semibold">{money(activeSummary.virtualAmountStartedWith)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total In</span><span className="font-mono font-semibold text-emerald-600">{money(activeSummary.totalVirtualCredit)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Out</span><span className="font-mono font-semibold text-destructive">{money(activeSummary.totalVirtualDebit)}</span></div>
                </div>
              </div>
            )}
            {drawer.isOpen ? (
              <DrawerTransactionsTable drawerId={drawer.id} forActiveSessionOnly refreshKey={refreshKey} onChanged={refresh} />
            ) : (
              <div className="rounded-xl bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Please start the drawer to view current transactions.
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <DrawerTransactionsTable drawerId={drawer.id} refreshKey={refreshKey} onChanged={refresh} />
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <DrawerSessionsTable drawerId={drawer.id} drawerName={drawer.name} refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="rounded-xl bg-muted/30 p-6 text-center text-sm text-muted-foreground">Loading drawer...</div>
      )}

      <OpenDrawerDrawer open={openDrawerOpen} drawer={drawer} onClose={() => setOpenDrawerOpen(false)} onDone={refresh} />
      <CloseDrawerDrawer open={closeDrawerOpen} drawer={drawer} onClose={() => setCloseDrawerOpen(false)} onDone={refresh} />
      <CashMovementDrawer open={depositOpen} mode="deposit" drawer={drawer} onClose={() => setDepositOpen(false)} onDone={refresh} />
      <CashMovementDrawer open={withdrawOpen} mode="withdraw" drawer={drawer} onClose={() => setWithdrawOpen(false)} onDone={refresh} />
    </div>
  );
}
