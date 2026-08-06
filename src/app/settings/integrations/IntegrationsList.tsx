"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, CreditCard } from "lucide-react";

import { fetchWeedmapsConfig } from "@/services/weedmaps/getConfigs";
import { getAeropayConfigs } from "@/services/aeropay/getConfigs";
import { fetchLeaflyConfig } from "@/services/leafly/getConfig";
import { getBreeoConfig } from "@/services/breeo/getConfig";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

import WeedmapsSettings from "./weedmaps/WeedmapsSettings";
import AeropaySettings from "./aeropay/AeropaySettings";
import LeaflySettings from "./leafly/LeaflySettings";
import BreeoSettings from "./breeo/BreeoSettings";

type IntegrationId = "weedmaps" | "aeropay" | "leafly" | "breeo";
type IntegrationStatus = "Active" | "Setup";

const INTEGRATIONS: { id: IntegrationId; name: string; description: string; image?: string; icon?: React.ReactNode }[] = [
  {
    id: "weedmaps",
    name: "Weedmaps",
    description: "Weedmaps integration provides secure menu sync and inventory management solutions specifically designed for cannabis businesses.",
    image: "/images/vm.png",
  },
  {
    id: "aeropay",
    name: "Bleaum Pay",
    description: "Bleaum Pay offers digital payment solutions that help cannabis businesses accept secure, compliant transactions.",
    image: "/images/bleaumPay.jpeg",
  },
  {
    id: "leafly",
    name: "Leafly",
    description: "Leafly integration enables seamless menu synchronization and order management for cannabis dispensaries.",
    image: "/images/leafly-logo.png",
  },
  {
    id: "breeo",
    name: "Bleaum Digital Pay",
    description: "Bleaum Digital Pay enables cashless ATM payments at your registers, letting customers pay by debit card without a separate card processor.",
    icon: <CreditCard className="size-10 text-primary" />,
  },
];

export default function IntegrationsList() {
  const [statuses, setStatuses] = useState<Record<IntegrationId, IntegrationStatus>>({
    weedmaps: "Setup",
    aeropay: "Setup",
    leafly: "Setup",
    breeo: "Setup",
  });
  const [openDrawer, setOpenDrawer] = useState<IntegrationId | null>(null);

  const refreshStatuses = () => {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    Promise.all([fetchWeedmapsConfig(shopId), getAeropayConfigs(), fetchLeaflyConfig(shopId), getBreeoConfig()]).then(
      ([weedmaps, aeropay, leafly, breeo]) => {
        const w = weedmaps?.data?.data;
        const a = aeropay?.data?.data;
        const l = leafly?.data?.data;
        const b = breeo?.data?.data;

        setStatuses({
          weedmaps: w?.clientId && w?.secretId && w?.merchantId ? "Active" : "Setup",
          aeropay: a?.apiKey && a?.apiSecret && a?.merchantId && a?.merchantLocationId ? "Active" : "Setup",
          leafly: l?.menuIntegrationKey ? "Active" : "Setup",
          breeo: b?.isActive ? "Active" : "Setup",
        });
      }
    );
  };

  useEffect(() => {
    refreshStatuses();
  }, []);

  const updateStatus = (id: IntegrationId, status: IntegrationStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const handleDrawerClose = () => {
    setOpenDrawer(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Integrations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <p className="text-muted-foreground">
        Connect your favorite tools and services to streamline your business operations
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const status = statuses[integration.id];
          return (
            <button key={integration.id} type="button" onClick={() => setOpenDrawer(integration.id)} className="text-left">
              <Card className="flex h-full flex-col justify-between gap-4 p-6 ring-1 ring-foreground/10 transition-all hover:-translate-y-1.5 hover:shadow-lg hover:ring-foreground/20">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex size-25 items-center justify-center overflow-hidden rounded-xl bg-muted p-2 ring-1 ring-foreground/10">
                      {integration.image ? (
                        <Image
                          src={integration.image}
                          alt={`${integration.name} logo`}
                          width={100}
                          height={100}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        integration.icon
                      )}
                    </div>
                    <Badge variant={status === "Active" ? "default" : "secondary"} className="h-6 rounded-full px-3">
                      {status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="mb-1.5 text-lg font-semibold">{integration.name}</h3>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                </div>

                <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-muted text-sm font-medium transition-colors">
                  {status === "Active" ? "Manage Integration" : "Setup Integration"}
                  <ArrowRight className="size-3.5" />
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <WeedmapsSettings open={openDrawer === "weedmaps"} onClose={handleDrawerClose} onSaved={() => updateStatus("weedmaps", "Active")} />
      <AeropaySettings open={openDrawer === "aeropay"} onClose={handleDrawerClose} onSaved={() => updateStatus("aeropay", "Active")} />
      <LeaflySettings open={openDrawer === "leafly"} onClose={handleDrawerClose} onSaved={() => updateStatus("leafly", "Active")} />
      <BreeoSettings
        open={openDrawer === "breeo"}
        onClose={handleDrawerClose}
        onSaved={() => updateStatus("breeo", "Active")}
        onStatusToggle={(active) => updateStatus("breeo", active ? "Active" : "Setup")}
      />
    </div>
  );
}
