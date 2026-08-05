"use client";

import { Settings2, Share2, Smartphone, KeyRound, BarChart3, ShoppingCart, FileText } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SocialLinksTab from "./SocialLinksTab";
import ApkManagementTab from "./ApkManagementTab";
import ApiKeysTab from "./ApiKeysTab";
import GoogleAnalyticsTab from "./GoogleAnalyticsTab";
import OrderSettingsTab from "./OrderSettingsTab";
import CustomPagesTab from "./CustomPagesTab";

const TABS = [
  { key: "social-links", label: "Social Links", icon: Share2, component: SocialLinksTab },
  { key: "apk-management", label: "App Management", icon: Smartphone, component: ApkManagementTab },
  { key: "api-keys", label: "API Keys", icon: KeyRound, component: ApiKeysTab },
  { key: "google-analytics", label: "Google Analytics", icon: BarChart3, component: GoogleAnalyticsTab },
  { key: "accept-orders", label: "Order Settings", icon: ShoppingCart, component: OrderSettingsTab },
  { key: "custom-pages", label: "EULA", icon: FileText, component: CustomPagesTab },
];

export default function GeneralConfigurationTabs() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Settings2 className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">General Configuration</h1>
          <p className="text-xs text-muted-foreground">Manage platform-wide settings for your storefront</p>
        </div>
      </div>

      <Tabs defaultValue={TABS[0].key}>
        <TabsList variant="line" className="h-auto w-full justify-start gap-1 pb-px">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="gap-1.5 rounded-md px-3 py-2 text-sm data-active:bg-primary/10"
            >
              <tab.icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ key, component: Component }) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
