"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import Image from "next/image";

import { fetchWeedmapsConfig } from "@/services/weedmaps/getConfigs";
import { saveWeedmapsConfig } from "@/services/weedmaps/saveConfig";

import Drawer from "@/components/ui/Drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function WeedmapsSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [menuId, setMenuId] = useState("");

  useEffect(() => {
    if (!open) return;
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    fetchWeedmapsConfig(shopId).then((res) => {
      const config = res?.data?.data;
      if (!config) return;
      setMerchantId(config.merchantId || "");
      setMenuId(config.menuId || "");
    });
  }, [open]);

  const handleSubmit = async () => {
    if (!merchantId.trim() || !menuId.trim()) {
      toast.error("Merchant ID and Menu ID are required.");
      return;
    }

    setLoading(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      await saveWeedmapsConfig({ shopId, merchantId, menuId });
      toast.success("Weedmaps configuration saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save Weedmaps configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={loading ? undefined : onClose} side="right" size={520}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            <Image src="/images/vm.png" alt="Weedmaps" width={32} height={32} className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Weedmaps Integration</div>
            <div className="text-xs leading-tight text-muted-foreground">Sync menu data with Weedmaps</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={loading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-sm text-muted-foreground">Configure your Weedmaps API credentials to sync menu data.</p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="merchant-id">Merchant ID</Label>
              <Input id="merchant-id" placeholder="Enter your Weedmaps Merchant ID" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="menu-id">Menu ID</Label>
              <Input id="menu-id" placeholder="Enter your Weedmaps Menu ID" value={menuId} onChange={(e) => setMenuId(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
