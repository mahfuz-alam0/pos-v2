"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { fetchSingleEmployee } from "@/services/employees/getSingle";
import { fetchSpiffCampaigns } from "@/services/spiffs/list";
import { useShop } from "@/context/shop-context";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline"> = { met: "default", missed: "destructive", progress: "outline" };
const STATUS_LABEL: Record<string, string> = { met: "Goal Met", missed: "Missed", progress: "In Progress" };
const MAX_VISIBLE_SPIFFS = 5;

export default function EmployeeDetailPanel({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const { shopId } = useShop();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [spiffs, setSpiffs] = useState<any[]>([]);
  const [spiffsLoading, setSpiffsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchSingleEmployee(employeeId)
      .then((res) => setEmployee(res?.data?.account ?? res?.data?.employee ?? res?.data ?? null))
      .catch((err) => console.error("Failed to load employee", err))
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    if (!shopId) return;
    setSpiffsLoading(true);
    const today = nowInShopTimezone().format("YYYY-MM-DD");
    fetchSpiffCampaigns({ shopId, startDate: today.slice(0, 8) + "01", endDate: today })
      .then((res) => {
        const campaigns = res?.data?.campaigns ?? [];
        const mine = campaigns
          .flatMap((c: any) => (c.contributors ?? []).filter((contributor: any) => contributor.id === employeeId).map((contributor: any) => ({ ...c, contribution: contributor.value })))
          .sort((a: any, b: any) => b.contribution - a.contribution);
        setSpiffs(mine);
      })
      .catch((err) => console.error("Failed to load spiff history", err))
      .finally(() => setSpiffsLoading(false));
  }, [employeeId, shopId]);

  const rows = [
    { label: "Name", value: employee?.name ?? "-" },
    { label: "Email", value: employee?.email ?? "-" },
    { label: "Username", value: employee?.username ?? "-" },
    { label: "Country", value: employee?.countryCode ?? "-" },
    { label: "Phone", value: employee?.phone ?? "-" },
    { label: "Role", value: employee?.roleInfo?.name ?? "-" },
    { label: "Associated Shops", value: employee?.associatedShopIds?.length ?? 0 },
    { label: "Documents", value: employee?.documentLinks?.length ?? 0 },
    { label: "Status", value: employee?.lockedAt ? "Locked" : "Active" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="text-sm font-semibold">Employee Details</div>
        <div className="flex items-center gap-2">
          {employee?.type && <Badge variant={employee.type === "ADMINISTRATION" ? "default" : "secondary"}>{employee.type}</Badge>}
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
          : rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-foreground/5 pb-2">
                <span className="w-2/5 text-muted-foreground">{row.label}</span>
                <span className="w-3/5 text-right font-medium">{row.value}</span>
              </div>
            ))}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Spiff History — This Month</span>
          <Link href={`/access-management/spiffs?employeeId=${employeeId}`} className="text-xs font-medium text-primary hover:underline">
            View full history →
          </Link>
        </div>

        {spiffsLoading ? (
          <Skeleton className="h-4 w-full" />
        ) : spiffs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spiff contributions this month.</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            {spiffs.slice(0, MAX_VISIBLE_SPIFFS).map((spiff) => {
              const unitLabel = spiff.goalType === "revenue" ? "" : " units";
              const fmt = (value: number) => (spiff.goalType === "revenue" ? formatCurrency(value) : Math.round(value).toLocaleString("en-US"));
              return (
                <div key={spiff.id} className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 truncate font-medium">{spiff.title}</span>
                    <Badge variant={STATUS_VARIANT[spiff.status]} className="shrink-0 text-xs">
                      {STATUS_LABEL[spiff.status]}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-sm font-semibold whitespace-nowrap">
                    {fmt(spiff.contribution)}
                    {unitLabel}
                  </span>
                </div>
              );
            })}
            {spiffs.length > MAX_VISIBLE_SPIFFS && (
              <Link href={`/access-management/spiffs?employeeId=${employeeId}`} className="text-xs text-muted-foreground hover:underline">
                +{spiffs.length - MAX_VISIBLE_SPIFFS} more this month
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
