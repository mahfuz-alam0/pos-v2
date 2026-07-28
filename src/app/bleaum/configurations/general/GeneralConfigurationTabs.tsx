"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SocialLinksTab from "./SocialLinksTab";
import ApkManagementTab from "./ApkManagementTab";
import ApiKeysTab from "./ApiKeysTab";
import GoogleAnalyticsTab from "./GoogleAnalyticsTab";
import OrderSettingsTab from "./OrderSettingsTab";
import CustomPagesTab from "./CustomPagesTab";

const TABS = [
  { key: "social-links", label: "Social Links", component: SocialLinksTab },
  { key: "apk-management", label: "APP MGMT", component: ApkManagementTab },
  { key: "api-keys", label: "API Keys", component: ApiKeysTab },
  { key: "google-analytics", label: "Google Analytics", component: GoogleAnalyticsTab },
  { key: "accept-orders", label: "Order Settings", component: OrderSettingsTab },
  { key: "custom-pages", label: "EULA", component: CustomPagesTab },
];

export default function GeneralConfigurationTabs() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">General Configuration</h1>

      <Tabs defaultValue={TABS[0].key}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ key, component: Component }) => (
          <TabsContent key={key} value={key}>
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
