"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PackageReconciliationTab from "./PackageReconciliationTab";
import AuditSessionsTab from "./AuditSessionsTab";

export default function ReconciliationTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "audit" ? "audit" : "package";

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      params.delete("id");
      params.delete("adjustmentId");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Reconciliation</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="package">Package Reconciliation</TabsTrigger>
          <TabsTrigger value="audit">Audit Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="package">
          <PackageReconciliationTab />
        </TabsContent>
        <TabsContent value="audit">
          <AuditSessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
