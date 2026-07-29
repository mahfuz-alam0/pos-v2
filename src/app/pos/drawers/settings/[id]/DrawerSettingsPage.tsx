"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
            <BreadcrumbPage>Settings</BreadcrumbPage>
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
              <SelectTrigger className="mt-2 w-56">
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

        <div className="flex flex-wrap gap-2">
          {drawer?.isOpen ? (
            <Button onClick={() => setDepositOpen(true)}>Deposit Cash</Button>
          ) : (
            <Button onClick={() => setOpenDrawerOpen(true)}>Start Drawer</Button>
          )}
          {drawer && (
            <>
              <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
                Withdraw Cash
              </Button>
              <Button variant="outline" onClick={() => setCloseDrawerOpen(true)}>
                Balance Drawer (EOD)
              </Button>
            </>
          )}
        </div>
      </div>

      {drawer ? (
        <Tabs defaultValue="current">
          <TabsList>
            <TabsTrigger value="current">Current Transactions</TabsTrigger>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="sessions">Drawer Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="flex flex-col gap-4">
            {drawer.isOpen && activeSummary && (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl ring-1 ring-foreground/10 p-4">
                  <div className="mb-2 text-sm font-semibold">Cash</div>
                  <div className="flex justify-between text-sm"><span>Started With</span><span className="font-mono font-semibold">{money(activeSummary.cashAmountStartedWith)}</span></div>
                  <div className="flex justify-between text-sm"><span>Total In</span><span className="font-mono font-semibold">{money(activeSummary.totalCashCredit)}</span></div>
                  <div className="flex justify-between text-sm"><span>Total Out</span><span className="font-mono font-semibold">{money(activeSummary.totalCashDebit)}</span></div>
                </div>
                <div className="rounded-xl ring-1 ring-foreground/10 p-4">
                  <div className="mb-2 text-sm font-semibold">Virtual</div>
                  <div className="flex justify-between text-sm"><span>Started With</span><span className="font-mono font-semibold">{money(activeSummary.virtualAmountStartedWith)}</span></div>
                  <div className="flex justify-between text-sm"><span>Total In</span><span className="font-mono font-semibold">{money(activeSummary.totalVirtualCredit)}</span></div>
                  <div className="flex justify-between text-sm"><span>Total Out</span><span className="font-mono font-semibold">{money(activeSummary.totalVirtualDebit)}</span></div>
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

          <TabsContent value="all">
            <DrawerTransactionsTable drawerId={drawer.id} refreshKey={refreshKey} onChanged={refresh} />
          </TabsContent>

          <TabsContent value="sessions">
            <DrawerSessionsTable drawerId={drawer.id} refreshKey={refreshKey} />
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
