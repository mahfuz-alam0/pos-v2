"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/form-fields";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { fetchShopsData } from "@/services/shops/list";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/services/promotions/enums";
import { buildDefaultShopExpiry } from "@/services/promotions/defaultShopExpiry";

export interface ShopExpiry {
  shopId: string;
  startsAtDate: string;
  startsAtTime: string;
  neverExpires: boolean;
  endsAtDate: string | null;
  endsAtTime: string | null;
  isEnabled: boolean;
  slots: Record<string, { from: string; to: string; disabled: boolean }>;
}

function to24h(time12: string) {
  const m = time12?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return "00:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function to12h(time24: string) {
  const [hStr, min] = (time24 || "00:00").split(":");
  let h = parseInt(hStr, 10);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
}

export function ValidityScheduler({
  value,
  onChange,
  fetchScopedShopIds,
}: {
  value: ShopExpiry[];
  onChange: (next: ShopExpiry[]) => void;
  /** Restricts the shop list to those this admin manages promos for; falls back to all shops if omitted. */
  fetchScopedShopIds?: () => Promise<{ data?: string[] }>;
}) {
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([fetchShopsData(), fetchScopedShopIds ? fetchScopedShopIds() : Promise.resolve(null)]).then(
      ([shopsRes, scopedRes]) => {
        let list = shopsRes?.data || [];
        const scopedIds: string[] | undefined = scopedRes?.data;
        if (scopedIds?.length) {
          const allowed = new Set(scopedIds);
          list = list.filter((s: any) => allowed.has(s.id));
        }
        setShops(list);
        // Seed a default (disabled-until-configured) expiry entry for any shop not yet present.
        const existingIds = new Set(value.map((v) => v.shopId));
        const missing = list.filter((s: any) => !existingIds.has(s.id));
        if (missing.length) {
          onChange([...value, ...missing.map((s: any) => buildDefaultShopExpiry(s.id))]);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateShop = (shopId: string, patch: Partial<ShopExpiry>) => {
    onChange(value.map((v) => (v.shopId === shopId ? { ...v, ...patch } : v)));
  };

  const updateSlot = (shopId: string, day: string, patch: Partial<{ from: string; to: string; disabled: boolean }>) => {
    onChange(
      value.map((v) =>
        v.shopId === shopId ? { ...v, slots: { ...v.slots, [day]: { ...v.slots[day], ...patch } } } : v
      )
    );
  };

  const applyToAll = (source: ShopExpiry) => {
    onChange(value.map((v) => (v.shopId === source.shopId ? v : { ...source, shopId: v.shopId })));
  };

  const shopName = (id: string) => shops.find((s) => s.id === id)?.name || id;

  return (
    <Accordion multiple>
      {value.map((shop) => (
        <AccordionItem key={shop.shopId} value={shop.shopId}>
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              {shopName(shop.shopId)}
              {!shop.isEnabled && <span className="text-xs text-muted-foreground">(disabled)</span>}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4 pl-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Switch checked={shop.isEnabled} onCheckedChange={(c) => updateShop(shop.shopId, { isEnabled: !!c })} />
                  Enabled at this shop
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => applyToAll(shop)}>
                  <Copy className="size-3.5" /> Apply to all shops
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={shop.startsAtDate}
                      onChange={(e) => updateShop(shop.shopId, { startsAtDate: e.target.value })}
                    />
                    <input
                      type="time"
                      className="h-8 w-28 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={to24h(shop.startsAtTime)}
                      onChange={(e) => updateShop(shop.shopId, { startsAtTime: to12h(e.target.value) })}
                    />
                  </div>
                </Field>

                <div className="flex items-center gap-2 self-end pb-1.5 text-sm font-medium">
                  <Switch checked={shop.neverExpires} onCheckedChange={(c) => updateShop(shop.shopId, { neverExpires: !!c })} />
                  Never expires
                </div>
              </div>

              {!shop.neverExpires && (
                <Field label="Ends">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={shop.endsAtDate || ""}
                      onChange={(e) => updateShop(shop.shopId, { endsAtDate: e.target.value })}
                    />
                    <input
                      type="time"
                      className="h-8 w-28 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={to24h(shop.endsAtTime || "12:00 AM")}
                      onChange={(e) => updateShop(shop.shopId, { endsAtTime: to12h(e.target.value) })}
                    />
                  </div>
                </Field>
              )}

              <Field label="Active Hours by Day">
                <div className="flex flex-col gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const slot = shop.slots[day];
                    return (
                      <div key={day} className="flex items-center gap-2 rounded-lg p-2 ring-1 ring-foreground/10">
                        <Checkbox
                          checked={!slot.disabled}
                          onCheckedChange={(c) => updateSlot(shop.shopId, day, { disabled: !c })}
                        />
                        <span className="w-24 text-sm">{WEEKDAY_LABELS[day as keyof typeof WEEKDAY_LABELS]}</span>
                        {!slot.disabled && (
                          <>
                            <input
                              type="time"
                              className="h-8 w-28 rounded-lg border border-input bg-transparent px-2 text-sm"
                              value={to24h(slot.from)}
                              onChange={(e) => updateSlot(shop.shopId, day, { from: to12h(e.target.value) })}
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <input
                              type="time"
                              className="h-8 w-28 rounded-lg border border-input bg-transparent px-2 text-sm"
                              value={to24h(slot.to)}
                              onChange={(e) => updateSlot(shop.shopId, day, { to: to12h(e.target.value) })}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
