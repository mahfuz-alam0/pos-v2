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
    endsAtTime: "11:59 PM",
    isEnabled: true,
    slots: buildDefaultSlots(),
  };
}

// ponytail: backend requires endsAtTime as a non-null string even when neverExpires is true;
// older records saved before that constraint (or the "never expires" toggle) can carry null.
export function sanitizeShopExpiry<T extends { endsAtTime: string | null }>(list: T[] | undefined | null): T[] {
  return (list ?? []).map((shop) => (shop.endsAtTime ? shop : { ...shop, endsAtTime: "11:59 PM" }));
}
