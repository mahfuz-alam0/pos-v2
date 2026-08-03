"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import CouponsTab from "./coupons/CouponsTab";
import DealsTab from "./deals/DealsTab";
import LoyaltySettingsTab from "./loyalty/LoyaltySettingsTab";

export default function PromotionsTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = ["coupons", "deals", "loyalty"].includes(searchParams.get("tab") || "") ? searchParams.get("tab")! : "coupons";

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams();
      params.set("tab", value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname]
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Promotions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="coupons" className="mt-4">
          <CouponsTab />
        </TabsContent>
        <TabsContent value="deals" className="mt-4">
          <DealsTab />
        </TabsContent>
        <TabsContent value="loyalty" className="mt-4">
          <LoyaltySettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
