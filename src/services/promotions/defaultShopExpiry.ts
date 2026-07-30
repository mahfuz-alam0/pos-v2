import { WEEKDAYS } from "./enums";

export function buildDefaultSlots() {
  const slots: Record<string, { from: string; to: string; disabled: boolean }> = {};
  for (const day of WEEKDAYS) {
    slots[day] = { from: "12:01 AM", to: "11:59 PM", disabled: true };
  }
  return slots;
}

export function buildDefaultShopExpiry(shopId: string) {
  return {
    shopId,
    startsAtDate: new Date().toISOString().slice(0, 10),
    startsAtTime: "12:00 AM",
    neverExpires: true,
    endsAtDate: null,
    endsAtTime: null,
    isEnabled: true,
    slots: buildDefaultSlots(),
  };
}
