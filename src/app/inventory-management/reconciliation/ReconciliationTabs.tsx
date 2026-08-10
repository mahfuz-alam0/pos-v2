"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PackageReconciliationTab from "./PackageReconciliationTab";
import AuditSessionsTab from "./AuditSessionsTab";

const TAB_LABEL_CLASS =
  "h-auto flex-none -mb-px rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 pb-3 text-sm font-normal text-foreground/70 after:hidden focus-visible:border-b-primary focus-visible:ring-0 focus-visible:outline-none data-active:border-primary";

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
    <div className="flex gap-4 p-3">
      <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card px-4 py-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">Reconciliation</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
          <div className="border-b border-border">
            <TabsList variant="line" className="h-auto gap-7 p-0">
              <TabsTrigger value="package" className={TAB_LABEL_CLASS}>
                Package Reconciliation
              </TabsTrigger>
              <TabsTrigger value="audit" className={TAB_LABEL_CLASS}>
                Audit Sessions
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="package" className="mt-4">
            <PackageReconciliationTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <AuditSessionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
