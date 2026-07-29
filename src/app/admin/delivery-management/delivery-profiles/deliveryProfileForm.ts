export const WEEKDAYS = [
  { key: "MON", label: "Monday" },
  { key: "TUE", label: "Tuesday" },
  { key: "WED", label: "Wednesday" },
  { key: "THU", label: "Thursday" },
  { key: "FRI", label: "Friday" },
  { key: "SAT", label: "Saturday" },
  { key: "SUN", label: "Sunday" },
] as const;

export const EXCEPTION_TYPES = [
  { value: "CATEGORY", label: "Category" },
  { value: "TAG", label: "Tag" },
  { value: "PRODUCT", label: "Product" },
  { value: "CUSTOMER_GROUP", label: "Customer Group" },
] as const;

export const REGION_LABELS: Record<string, string> = { CALIFORNIA: "California", MICHIGAN: "Michigan" };

export interface TimeSlot {
  from: string | null;
  to: string | null;
}

export interface DaySlots {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface DistanceTier {
  from: number;
  to: number;
  additionalCharge: number;
  additionalTime: number;
}

export interface OrderValueTier {
  from: number;
  to: number;
  additionalCharge: number;
}

export interface ExceptionRule {
  type: string | null;
  ids: string[];
}

export interface SpeedTier {
  externalId?: string;
  name: string;
  description: string;
  fee: number;
}

export interface FormValues {
  isEnabled: boolean;
  state: string;
  zipMode: "ALL" | "INCLUDE" | "EXCLUDE";
  zipCodes: string[];
  pricingMode: "FLAT_RATE" | "DISTANCE_BASED" | "ORDER_VALUE_BASED" | "FREE";
  flatRate_deliveryChargeType: "PER_ORDER_BASIS" | "PER_ITEM_BASIS";
  flatRate_deliveryCharge: number;
  flatRate_shouldCheckMinimumOrderValue: boolean;
  flatRate_minimumOrderValue: number;
  flatRate_shouldAllowFreeDelivery: boolean;
  flatRate_freeDeliveryValue: number;
  distance_baseCharge: number;
  distance_shouldCheckMinimumOrderValue: boolean;
  distance_minimumOrderValue: number;
  distance_shouldAllowFreeDelivery: boolean;
  distance_freeDeliveryValue: number;
  distanceTiers: DistanceTier[];
  orderValue_baseCharge: number;
  orderValue_shouldCheckMinimumOrderValue: boolean;
  orderValue_minimumOrderValue: number;
  orderValue_shouldAllowFreeDelivery: boolean;
  orderValue_freeDeliveryValue: number;
  orderValueTiers: OrderValueTier[];
  free_shouldCheckMinimumOrderValue: boolean;
  free_minimumOrderValue: number;
  exceptionRules: ExceptionRule[];
  speedTiersEnabled: boolean;
  speedTiers: SpeedTier[];
  shouldAllowUserToPickDeliverySlots: boolean;
  deliverySlots: Record<string, DaySlots>;
  estimationFromTime: number;
  estimationToTime: number;
  estimationWindowType: "HOURS" | "MINS" | "DAYS";
}

function generateId(len = 10) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

export function makeDefaultValues(): FormValues {
  return {
    isEnabled: true,
    state: "CALIFORNIA",
    zipMode: "ALL",
    zipCodes: [],
    pricingMode: "FLAT_RATE",
    flatRate_deliveryChargeType: "PER_ORDER_BASIS",
    flatRate_deliveryCharge: 0,
    flatRate_shouldCheckMinimumOrderValue: false,
    flatRate_minimumOrderValue: 0,
    flatRate_shouldAllowFreeDelivery: false,
    flatRate_freeDeliveryValue: 0,
    distance_baseCharge: 0,
    distance_shouldCheckMinimumOrderValue: false,
    distance_minimumOrderValue: 0,
    distance_shouldAllowFreeDelivery: false,
    distance_freeDeliveryValue: 0,
    distanceTiers: [{ from: 0, to: 5, additionalCharge: 0, additionalTime: 0 }],
    orderValue_baseCharge: 0,
    orderValue_shouldCheckMinimumOrderValue: false,
    orderValue_minimumOrderValue: 0,
    orderValue_shouldAllowFreeDelivery: false,
    orderValue_freeDeliveryValue: 0,
    orderValueTiers: [{ from: 0, to: 50, additionalCharge: 0 }],
    free_shouldCheckMinimumOrderValue: false,
    free_minimumOrderValue: 0,
    exceptionRules: [],
    speedTiersEnabled: false,
    speedTiers: [],
    shouldAllowUserToPickDeliverySlots: false,
    deliverySlots: Object.fromEntries(WEEKDAYS.map(({ key }) => [key, { enabled: false, slots: [] }])),
    estimationFromTime: 1,
    estimationToTime: 2,
    estimationWindowType: "HOURS",
  };
}

function to24h(time: string | null | undefined): string | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return null;
  let hours = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") hours += 12;
  return `${String(hours).padStart(2, "0")}:${m[2]}`;
}

function to12h(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function seedFromProfile(profile: any): FormValues {
  if (!profile) return makeDefaultValues();
  const s = profile.deliveryChargeStrategy ?? {};
  const chargeType = s.chargeType ?? "FLAT_RATE";
  const raw = s.strategy ?? {};
  const flat = chargeType === "FLAT_RATE" ? raw : s.flatRateStrategy ?? {};
  const dist = chargeType === "DISTANCE_BASED" ? raw : s.distanceBasedStrategy ?? {};
  const ov = chargeType === "ORDER_VALUE_BASED" ? raw : s.orderValueBasedStrategy ?? {};
  const free = chargeType === "FREE" ? raw : s.freeStrategy ?? {};

  const slots: Record<string, DaySlots> = {};
  WEEKDAYS.forEach(({ key }) => {
    const daySlots = profile.recurringDeliverySlots?.[key] ?? [];
    slots[key] = {
      enabled: daySlots.length > 0 && daySlots.some((sl: any) => !sl.disabled),
      slots: daySlots.map((sl: any) => ({ from: to24h(sl.from), to: to24h(sl.to) })),
    };
  });

  const ew = profile.estimationWindow ?? {};

  return {
    isEnabled: profile.isEnabled ?? true,
    state: profile.zipCodePreference?.region ?? "CALIFORNIA",
    zipMode: profile.zipCodePreference?.zipCodePreference ?? "ALL",
    zipCodes: profile.zipCodePreference?.targetZipCodes ?? [],
    pricingMode: chargeType,
    flatRate_deliveryChargeType: flat.deliveryChargeType ?? "PER_ORDER_BASIS",
    flatRate_deliveryCharge: flat.deliveryCharge ?? 0,
    flatRate_shouldCheckMinimumOrderValue: flat.minimumOrderValue?.shouldCheckMinimumOrderValue ?? false,
    flatRate_minimumOrderValue: flat.minimumOrderValue?.minimumOrderValue ?? 0,
    flatRate_shouldAllowFreeDelivery: flat.freeDeliveryRule?.shouldAllowFreeDelivery ?? false,
    flatRate_freeDeliveryValue: flat.freeDeliveryRule?.freeDeliveryValue ?? 0,
    distance_baseCharge: dist.baseCharge ?? 0,
    distance_shouldCheckMinimumOrderValue: dist.minimumOrderValue?.shouldCheckMinimumOrderValue ?? false,
    distance_minimumOrderValue: dist.minimumOrderValue?.minimumOrderValue ?? 0,
    distance_shouldAllowFreeDelivery: dist.freeDeliveryRule?.shouldAllowFreeDelivery ?? false,
    distance_freeDeliveryValue: dist.freeDeliveryRule?.freeDeliveryValue ?? 0,
    distanceTiers: dist.distanceTiers?.length ? dist.distanceTiers : [{ from: 0, to: 5, additionalCharge: 0, additionalTime: 0 }],
    orderValue_baseCharge: ov.baseCharge ?? 0,
    orderValue_shouldCheckMinimumOrderValue: ov.minimumOrderValue?.shouldCheckMinimumOrderValue ?? false,
    orderValue_minimumOrderValue: ov.minimumOrderValue?.minimumOrderValue ?? 0,
    orderValue_shouldAllowFreeDelivery: ov.freeDeliveryRule?.shouldAllowFreeDelivery ?? false,
    orderValue_freeDeliveryValue: ov.freeDeliveryRule?.freeDeliveryValue ?? 0,
    orderValueTiers: ov.orderValueTiers?.length ? ov.orderValueTiers : [{ from: 0, to: 50, additionalCharge: 0 }],
    free_shouldCheckMinimumOrderValue: free.minimumOrderValue?.shouldCheckMinimumOrderValue ?? false,
    free_minimumOrderValue: free.minimumOrderValue?.minimumOrderValue ?? 0,
    exceptionRules: (profile.exceptionRules ?? []).map((r: any) => ({ type: r.type, ids: r.stringifiedIds ?? [] })),
    speedTiersEnabled: (profile.priorityTiers ?? []).length > 0,
    speedTiers: (profile.priorityTiers ?? []).map((t: any) => ({
      externalId: t.externalId,
      name: t.name,
      description: t.description ?? "",
      fee: t.additionalCharge ?? 0,
    })),
    shouldAllowUserToPickDeliverySlots: profile.shouldAllowUserToPickDeliverySlots ?? false,
    deliverySlots: slots,
    estimationFromTime: ew.fromTime ?? 1,
    estimationToTime: ew.toTime ?? 2,
    estimationWindowType: ew.windowTimeType ?? "HOURS",
  };
}

export function buildPayload(values: FormValues, profileId?: string | null) {
  const recurringDeliverySlots: Record<string, any[]> = {};
  WEEKDAYS.forEach(({ key }) => {
    const day = values.deliverySlots?.[key] ?? { enabled: false, slots: [] };
    recurringDeliverySlots[key] = (day.slots ?? []).map((sl) => ({
      from: to12h(sl.from) ?? "12:01 AM",
      to: to12h(sl.to) ?? "11:59 PM",
      disabled: !day.enabled,
    }));
  });

  const payload: Record<string, any> = {
    isEnabled: values.isEnabled ?? true,
    shouldAllowUserToPickDeliverySlots: values.shouldAllowUserToPickDeliverySlots ?? false,
    deliveryChargeStrategy: {
      chargeType: values.pricingMode,
      flatRateStrategy: {
        deliveryChargeType: values.flatRate_deliveryChargeType ?? "PER_ORDER_BASIS",
        deliveryCharge: values.flatRate_deliveryCharge ?? 0,
        minimumOrderValue: {
          shouldCheckMinimumOrderValue: values.flatRate_shouldCheckMinimumOrderValue ?? false,
          minimumOrderValue: values.flatRate_minimumOrderValue ?? 0,
        },
        freeDeliveryRule: {
          shouldAllowFreeDelivery: values.flatRate_shouldAllowFreeDelivery ?? false,
          freeDeliveryValue: values.flatRate_freeDeliveryValue ?? 0,
        },
      },
      freeStrategy: {
        minimumOrderValue: {
          shouldCheckMinimumOrderValue: values.free_shouldCheckMinimumOrderValue ?? false,
          minimumOrderValue: values.free_minimumOrderValue ?? 0,
        },
      },
      orderValueBasedStrategy: {
        baseCharge: values.orderValue_baseCharge ?? 0,
        orderValueTiers: (values.orderValueTiers ?? []).map((t) => ({
          from: t.from ?? 0,
          to: t.to ?? 0,
          additionalCharge: t.additionalCharge ?? 0,
        })),
        minimumOrderValue: {
          shouldCheckMinimumOrderValue: values.orderValue_shouldCheckMinimumOrderValue ?? false,
          minimumOrderValue: values.orderValue_minimumOrderValue ?? 0,
        },
        freeDeliveryRule: {
          shouldAllowFreeDelivery: values.orderValue_shouldAllowFreeDelivery ?? false,
          freeDeliveryValue: values.orderValue_freeDeliveryValue ?? 0,
        },
      },
      distanceBasedStrategy: {
        baseCharge: values.distance_baseCharge ?? 0,
        distanceTiers: (values.distanceTiers ?? []).map((t) => ({
          from: t.from ?? 0,
          to: t.to ?? 0,
          additionalCharge: t.additionalCharge ?? 0,
          additionalTime: t.additionalTime ?? 0,
        })),
        minimumOrderValue: {
          shouldCheckMinimumOrderValue: values.distance_shouldCheckMinimumOrderValue ?? false,
          minimumOrderValue: values.distance_minimumOrderValue ?? 0,
        },
        freeDeliveryRule: {
          shouldAllowFreeDelivery: values.distance_shouldAllowFreeDelivery ?? false,
          freeDeliveryValue: values.distance_freeDeliveryValue ?? 0,
        },
      },
    },
    zipCodePreference: {
      region: values.state ?? "CALIFORNIA",
      zipCodePreference: values.zipMode ?? "ALL",
      targetZipCodes: values.zipMode === "INCLUDE" || values.zipMode === "EXCLUDE" ? values.zipCodes ?? [] : [],
    },
    estimationWindow: {
      windowTimeType: values.estimationWindowType ?? "HOURS",
      fromTime: values.estimationFromTime ?? 1,
      toTime: values.estimationToTime ?? 2,
    },
    recurringDeliverySlots,
    exceptionRules: (values.exceptionRules ?? []).map((r) => ({ type: r.type, stringifiedIds: r.ids ?? [] })),
    priorityTiers: values.speedTiersEnabled
      ? (values.speedTiers ?? []).map((t) => ({
          externalId: t.externalId || generateId(10),
          name: t.name ?? "",
          description: t.description || null,
          additionalCharge: t.fee ?? 0,
        }))
      : [],
  };

  if (profileId) payload.id = profileId;
  return payload;
}
