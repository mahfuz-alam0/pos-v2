"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Trash2,
  Search,
  Home,
  Building2,
  Store,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { checkDeliveryAvailability } from "@/services/deliveryProfiles/checkAvailability";
import { setCustomerDeliveryLocations } from "@/services/customers/setDeliveryLocations";

// Same key the legacy DeliveryLocationsManager.js used for this exact
// Places API (New) integration (autocomplete + place details) — kept
// separate from this app's own NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (used for
// classic zip-code Geocoding elsewhere) since that key isn't confirmed
// enabled for Places (New) on this project, and this one is proven to work.
const GOOGLE_API_KEY = "AIzaSyDLMOAchlyTzXIUxwlJ0MMGZ5Eekl83wyU";
const PLACES_AUTOCOMPLETE_URL =
  "https://places.googleapis.com/v1/places:autocomplete";
const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

// Maps Google Places short code -> full uppercase state name required by the API
const US_STATE_MAP: Record<string, string> = {
  AL: "ALABAMA", AK: "ALASKA", AZ: "ARIZONA", AR: "ARKANSAS", CA: "CALIFORNIA",
  CO: "COLORADO", CT: "CONNECTICUT", DE: "DELAWARE", FL: "FLORIDA", GA: "GEORGIA",
  HI: "HAWAII", ID: "IDAHO", IL: "ILLINOIS", IN: "INDIANA", IA: "IOWA",
  KS: "KANSAS", KY: "KENTUCKY", LA: "LOUISIANA", ME: "MAINE", MD: "MARYLAND",
  MA: "MASSACHUSETTS", MI: "MICHIGAN", MN: "MINNESOTA", MS: "MISSISSIPPI",
  MO: "MISSOURI", MT: "MONTANA", NE: "NEBRASKA", NV: "NEVADA",
  NH: "NEW HAMPSHIRE", NJ: "NEW JERSEY", NM: "NEW MEXICO", NY: "NEW YORK",
  NC: "NORTH CAROLINA", ND: "NORTH DAKOTA", OH: "OHIO", OK: "OKLAHOMA",
  OR: "OREGON", PA: "PENNSYLVANIA", RI: "RHODE ISLAND", SC: "SOUTH CAROLINA",
  SD: "SOUTH DAKOTA", TN: "TENNESSEE", TX: "TEXAS", UT: "UTAH", VT: "VERMONT",
  VA: "VIRGINIA", WA: "WASHINGTON", WV: "WEST VIRGINIA", WI: "WISCONSIN",
  WY: "WYOMING", DC: "DISTRICT OF COLUMBIA",
};

const ALLOWED_STATES = ["CALIFORNIA", "MICHIGAN"];

const LOCATION_TYPES = [
  {
    key: "Home",
    label: "Home",
    Icon: Home,
    activeColor: "#16a34a",
    activeBg: "#f0fdf4",
    activeBorder: "#86efac",
    fields: ["streetAddress1", "streetAddress2", "houseNumber", "zipCode", "state", "country", "intercom"],
  },
  {
    key: "Apartment",
    label: "Apartment",
    Icon: Building2,
    activeColor: "#2563eb",
    activeBg: "#eff6ff",
    activeBorder: "#93c5fd",
    fields: ["streetAddress1", "streetAddress2", "apt", "floor", "zipCode", "state", "country", "intercom"],
  },
  {
    key: "Work",
    label: "Work",
    Icon: Store,
    activeColor: "#ea580c",
    activeBg: "#fff7ed",
    activeBorder: "#fdba74",
    fields: ["streetAddress1", "streetAddress2", "floor", "zipCode", "state", "country", "intercom"],
  },
  {
    key: "Other",
    label: "Other",
    Icon: MapPin,
    activeColor: "#7c3aed",
    activeBg: "#faf5ff",
    activeBorder: "#c4b5fd",
    fields: ["streetAddress1", "streetAddress2", "apt", "floor", "houseNumber", "zipCode", "state", "country", "intercom"],
  },
];

const ALL_FIELDS = [
  "streetAddress1", "streetAddress2", "apt", "floor", "houseNumber",
  "zipCode", "state", "country", "intercom",
];

const FIELD_CONFIG: Record<string, { label: string; placeholder: string; span: string; required?: boolean }> = {
  streetAddress1: { label: "Street Address 1", placeholder: "Street address line 1", span: "col-span-2" },
  streetAddress2: { label: "Street Address 2", placeholder: "Building, suite, unit, etc.", span: "col-span-2" },
  apt: { label: "Apt #", placeholder: "Apartment number", span: "col-span-1" },
  floor: { label: "Floor", placeholder: "Floor", span: "col-span-1" },
  houseNumber: { label: "House Number", placeholder: "House number", span: "col-span-1" },
  zipCode: { label: "Zip Code", placeholder: "Zip code", span: "col-span-1" },
  state: { label: "State", placeholder: "State", span: "col-span-1", required: true },
  country: { label: "Country", placeholder: "Country", span: "col-span-1" },
  intercom: { label: "Intercom / Buzzer", placeholder: "Intercom code", span: "col-span-2" },
};

const emptyLocation = () => ({
  _key: Date.now() + Math.random(),
  zipCode: "",
  country: "",
  state: "",
  intercom: "",
  houseNumber: "",
  floor: "",
  apt: "",
  streetAddress1: "",
  streetAddress2: "",
  tag: "",
  lat: "",
  long: "",
});

// Google Places API (New) address search — debounced autocomplete + place
// details lookup, ported from the admin DeliveryLocationsManager.js.
function AddressSearch({ onSelect }: { onSelect: (fields: any) => void }) {
  const [inputVal, setInputVal] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = async (query: string) => {
    if (!query || query.length < 3 || !GOOGLE_API_KEY) {
      setOptions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await axios.post(
        PLACES_AUTOCOMPLETE_URL,
        { input: query },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY,
          },
        },
      );
      const suggestions = res.data?.suggestions || [];
      setOptions(
        suggestions.map((s: any) => {
          const pred = s.placePrediction;
          const main = pred?.structuredFormat?.mainText?.text || pred?.text?.text || "";
          const secondary = pred?.structuredFormat?.secondaryText?.text || "";
          return {
            placeId: pred?.placeId,
            main,
            secondary,
            displayText: [main, secondary].filter(Boolean).join(", "),
          };
        }),
      );
    } catch {
      setOptions([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchDetails = async (placeId: string) => {
    const res = await axios.get(`${PLACES_DETAILS_URL}/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents",
      },
    });
    return res.data;
  };

  const handleChange = (val: string) => {
    setInputVal(val);
    setOpen(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 450);
  };

  const handleSelect = async (option: any) => {
    setInputVal(option.displayText || option.main);
    setOptions([]);
    setOpen(false);
    if (!option.placeId) return;
    try {
      const place = await fetchDetails(option.placeId);
      const comps = place.addressComponents || [];
      let streetNumber = "", route = "", zipCode = "", state = "", country = "", apt = "", floor = "";

      for (const c of comps) {
        if (c.types?.includes("street_number")) streetNumber = c.longText;
        if (c.types?.includes("route")) route = c.longText;
        if (c.types?.includes("postal_code")) zipCode = c.longText;
        if (c.types?.includes("subpremise")) apt = c.longText;
        if (c.types?.includes("floor")) floor = c.longText;
        if (c.types?.includes("administrative_area_level_1")) {
          const full = US_STATE_MAP[c.shortText] || c.longText?.toUpperCase() || c.shortText;
          state = ALLOWED_STATES.includes(full) ? full : "";
        }
        if (c.types?.includes("country")) country = c.shortText;
      }

      onSelect({
        streetAddress1: [streetNumber, route].filter(Boolean).join(" ") || place.formattedAddress,
        houseNumber: streetNumber,
        apt,
        floor,
        zipCode,
        state,
        country,
        lat: place.location?.latitude?.toString() || "",
        long: place.location?.longitude?.toString() || "",
      });
    } catch {
      /* user can fill manually */
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={inputVal}
          placeholder="Search address — auto-fills fields below"
          className="pl-8"
          onFocus={() => setOpen(true)}
          onChange={(e) => handleChange(e.target.value)}
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && inputVal.length >= 3 && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {searching ? (
            <div className="px-3 py-2 text-center text-sm text-muted-foreground">Searching…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-center text-sm text-muted-foreground">No results found</div>
          ) : (
            options.map((opt, i) => (
              <button
                key={opt.placeId ?? i}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleSelect(opt)}>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  {opt.main}
                </div>
                {opt.secondary && (
                  <div className="ml-5 text-xs text-muted-foreground">{opt.secondary}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TypeSelector({ selected, onChange }: { selected: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {LOCATION_TYPES.map((t) => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(active ? "" : t.key)}
            className="flex h-18 w-18 flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-all"
            style={{
              borderColor: active ? t.activeBorder : "var(--border)",
              background: active ? t.activeBg : "var(--background)",
              color: active ? t.activeColor : "var(--muted-foreground)",
              boxShadow: active ? `0 0 0 3px ${t.activeBorder}40` : "none",
            }}>
            <t.Icon className="size-5.5" style={{ color: active ? t.activeColor : undefined }} />
            <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LocationCard({
  loc,
  index,
  onUpdate,
  onUpdateBatch,
  onRemove,
  errors,
  availability,
  onCheckAvailability,
  selectedTier,
  onTierChange,
  scheduleForLater,
  onScheduleToggle,
  selectedSlot,
  onSlotChange,
}: any) {
  const selectedType = LOCATION_TYPES.find((t) => t.key === loc.tag);
  const visibleFields = selectedType ? selectedType.fields : ALL_FIELDS;
  const headerColor = selectedType?.activeColor || "#6b7280";
  const headerBg = selectedType?.activeBg || "var(--muted)";
  const headerBorder = selectedType?.activeBorder || "var(--border)";
  const HeaderIcon = selectedType?.Icon || MapPin;

  return (
    <div
      className="overflow-hidden rounded-xl border-2 bg-card shadow-sm"
      style={{ borderColor: headerBorder }}>
      {/* Card header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}` }}>
        <div className="flex items-center gap-2">
          <HeaderIcon className="size-4" style={{ color: headerColor }} />
          <span className="text-sm font-semibold" style={{ color: headerColor }}>
            {selectedType ? `${selectedType.label} — Location ${index}` : `Location ${index}`}
          </span>
          {loc.lat && loc.long && (
            <span
              className="rounded-md border bg-background px-1.5 py-0.5 font-mono text-[10px]"
              style={{ borderColor: headerBorder, color: headerColor }}>
              📍 {parseFloat(loc.lat).toFixed(4)}, {parseFloat(loc.long).toFixed(4)}
            </span>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onRemove}
                className="flex size-7 items-center justify-center rounded-full text-destructive hover:bg-destructive/10">
                <Trash2 className="size-4" />
              </button>
            }
          />
          <TooltipContent>Remove location</TooltipContent>
        </Tooltip>
      </div>

      {/* Delivery availability section */}
      <div className="border-b border-border">
        <div
          className="flex items-center justify-between gap-2 px-3.5 py-2"
          style={{
            background: !availability
              ? "var(--muted)"
              : availability.loading
                ? "var(--muted)"
                : availability.available
                  ? "#f0fdf4"
                  : "#fff1f0",
          }}>
          <div
            className="flex items-center gap-2 text-sm font-medium"
            style={{
              color: !availability
                ? "var(--muted-foreground)"
                : availability.loading
                  ? "var(--muted-foreground)"
                  : availability.available
                    ? "#15803d"
                    : "#dc2626",
            }}>
            {!availability && "Click ‘Check’ to verify delivery eligibility"}
            {availability?.loading && (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Checking delivery availability...
              </>
            )}
            {availability && !availability.loading && availability.available && (
              <>
                <CheckCircle2 className="size-4" /> Delivery available at this location
              </>
            )}
            {availability && !availability.loading && !availability.available && (
              <>
                <XCircle className="size-4" /> Delivery is not available at this location
              </>
            )}
          </div>
          {loc.lat && loc.long && loc.zipCode && loc.state && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCheckAvailability}
              disabled={availability?.loading}>
              {availability?.loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : availability && !availability.loading ? (
                "Recheck"
              ) : (
                "Check"
              )}
            </Button>
          )}
        </div>

        {/* Priority tiers + scheduling — shown when delivery is available */}
        {availability && !availability.loading && availability.available && (
          <div className="border-t border-border bg-muted/40">
            {availability.priorityTiers?.length > 0 && (
              <div className="border-b border-border px-3.5 py-3">
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Delivery Priority
                </div>
                <div className="flex flex-col gap-2">
                  {availability.priorityTiers.map((tier: any) => {
                    const active = selectedTier === tier.externalId;
                    return (
                      <button
                        key={tier.externalId}
                        type="button"
                        onClick={() => onTierChange(tier.externalId)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:bg-muted"
                        }`}>
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            active ? "border-primary" : "border-muted-foreground/40"
                          }`}>
                          {active && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{tier.name}</span>
                        {tier.description && (
                          <span className="text-xs text-muted-foreground">— {tier.description}</span>
                        )}
                        {tier.additionalCharge > 0 && (
                          <Badge className="ml-auto bg-orange-100 text-orange-700">
                            +${tier.additionalCharge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {availability.allowScheduling && availability.availableSlots?.length > 0 && (
              <div className="px-3.5 py-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={scheduleForLater}
                    onCheckedChange={(checked) => {
                      onScheduleToggle(!!checked);
                      if (!checked) onSlotChange(null);
                    }}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    Schedule delivery for later
                  </span>
                </label>

                {scheduleForLater && (
                  <div className="mt-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Select Delivery Slot
                    </div>
                    <div className="flex flex-col gap-2">
                      {availability.availableSlots.map((slot: any) => {
                        const active = selectedSlot === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => onSlotChange(slot.id)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              active
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted"
                            }`}>
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                active ? "border-primary" : "border-muted-foreground/40"
                              }`}>
                              {active && <span className="size-2 rounded-full bg-primary" />}
                            </span>
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Select Location Type</div>
          <TypeSelector selected={loc.tag} onChange={(val) => onUpdate("tag", val)} />
        </div>

        <div className="mb-3.5">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Search Address</div>
          <AddressSearch onSelect={(fields) => onUpdateBatch(fields)} />
        </div>

        {loc.tag ? (
          <div className="grid grid-cols-2 gap-2.5">
            {visibleFields.map((fieldKey) => {
              const cfg = FIELD_CONFIG[fieldKey];
              if (!cfg) return null;
              const fieldError = errors?.[fieldKey];
              return (
                <div key={fieldKey} className={cfg.span}>
                  <div className={`mb-1 text-xs font-medium ${fieldError ? "text-destructive" : "text-muted-foreground"}`}>
                    {cfg.required && <span className="mr-0.5 text-destructive">*</span>}
                    {cfg.label}
                  </div>
                  {fieldKey === "state" ? (
                    <Select
                      items={ALLOWED_STATES.map((s) => ({
                        value: s,
                        label: s.charAt(0) + s.slice(1).toLowerCase(),
                      }))}
                      value={loc.state || ""}
                      onValueChange={(val) => onUpdate("state", val)}>
                      <SelectTrigger className={`w-full ${fieldError ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOWED_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={loc[fieldKey] || ""}
                      onChange={(e) => onUpdate(fieldKey, e.target.value)}
                      placeholder={cfg.placeholder}
                      className={fieldError ? "border-destructive" : ""}
                    />
                  )}
                  {fieldError && (
                    <div className="mt-0.5 text-[11px] text-destructive">{fieldError}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-5 text-center text-sm text-muted-foreground">
            Select a location type above to fill in the address details
          </div>
        )}
      </div>
    </div>
  );
}

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABELS: Record<string, string> = {
  MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday",
  FRI: "Friday", SAT: "Saturday", SUN: "Sunday",
};

/**
 * DeliveryLocationsManager — add/edit a customer's delivery addresses, check
 * per-location delivery eligibility (delivery-profile lookup by lat/long +
 * zip/state), and pick a priority tier + optional scheduled delivery slot.
 * Ported from the admin Customer Management DeliveryLocationsManager.js.
 *
 * Props:
 *   customerId       — required to actually persist locations.
 *   initialLocations — pre-populated locations from customer data.
 *   fallbackAddress  — the customer's general on-file address ({streetAddress,
 *                       city, state, zipCode} — AddCustomerForm's Address
 *                       Information section). Only used to seed the first
 *                       card when initialLocations is empty, i.e. this
 *                       customer has never saved a delivery-specific address
 *                       before; still fully editable, and geocoded in the
 *                       background to fill in lat/long so availability can
 *                       be checked immediately.
 *   onChange         — called with the raw (unsaved) locations on every edit.
 *   standalone       — true: renders its own "Save" button.
 *   onSave           — called with saved locations, each annotated with
 *                       _selectedTier/_tierName/_tierCharge/_scheduleForLater/
 *                       _selectedSlot/_slotLabel/_slotDay/_slotFromTime/
 *                       _slotToTime metadata for the caller to consume.
 */
export default function DeliveryLocationsManager({
  customerId,
  initialLocations = [],
  fallbackAddress,
  onChange,
  fieldErrors,
  standalone = false,
  onSave,
}: {
  customerId?: string;
  initialLocations?: any[];
  fallbackAddress?: { streetAddress?: string; city?: string; state?: string; zipCode?: string } | null;
  onChange?: (locations: any[]) => void;
  fieldErrors?: Record<number, Record<string, string>>;
  standalone?: boolean;
  onSave?: (locations: any[]) => void;
}) {
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<number, Record<string, string>>>({});
  const [availability, setAvailability] = useState<Record<string, any>>({});
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
  const [scheduleForLater, setScheduleForLater] = useState<Record<string, boolean>>({});
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const initializedRef = useRef(false);

  const checkAvailability = useCallback(async (loc: any) => {
    if (!loc.lat || !loc.long || !loc.zipCode || !loc.state) return;
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    if (!shopId) return;

    setAvailability((prev) => ({
      ...prev,
      [loc._key]: { loading: true, available: null, profiles: [], priorityTiers: [] },
    }));
    try {
      const res = await checkDeliveryAvailability({
        shopId,
        zipCodeRegion: loc.state,
        zipCode: loc.zipCode,
        lat: loc.lat,
        long: loc.long,
      });
      const profiles = res?.data?.data?.applicableDeliveryProfiles || [];
      const available = res?.data?.success && profiles.length > 0;

      const tiersMap: Record<string, any> = {};
      profiles.forEach((p: any) => {
        (p.priorityTiers || []).forEach((t: any) => {
          tiersMap[t.externalId] = t;
        });
      });
      const priorityTiers = Object.values(tiersMap);

      const schedulingProfile = profiles.find((p: any) => p.shouldAllowUserToPickDeliverySlots);
      const allowScheduling = !!schedulingProfile;
      const availableSlots: any[] = [];
      if (schedulingProfile?.recurringDeliverySlots?.slots) {
        DAY_ORDER.forEach((day) => {
          const slots = schedulingProfile.recurringDeliverySlots.slots[day] || [];
          slots
            .filter((s: any) => !s.disabled)
            .forEach((slot: any, i: number) => {
              availableSlots.push({
                id: `${day}-${i}`,
                day,
                label: `${DAY_LABELS[day]} — ${slot.from.twelveHoursTimeString} to ${slot.to.twelveHoursTimeString}`,
                fromTime: slot.from.twelveHoursTimeString,
                toTime: slot.to.twelveHoursTimeString,
              });
            });
        });
      }

      setAvailability((prev) => ({
        ...prev,
        [loc._key]: { loading: false, available, profiles, priorityTiers, allowScheduling, availableSlots },
      }));
    } catch {
      setAvailability((prev) => ({
        ...prev,
        [loc._key]: { loading: false, available: false, profiles: [], priorityTiers: [] },
      }));
    }
  }, []);

  // One-shot classic Geocoding lookup for the seeded fallback card — fills in
  // lat/long + a properly-matched state so "Check" availability works right
  // away, without requiring the cashier to re-search the address.
  const geocodeFallbackSeed = useCallback(async (seedKey: any, addr: NonNullable<typeof fallbackAddress>) => {
    if (!GOOGLE_API_KEY) return;
    const query = [addr.streetAddress, addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
    if (!query) return;
    try {
      const res = await axios.get(GEOCODE_URL, { params: { address: query, key: GOOGLE_API_KEY } });
      const result = res.data?.results?.[0];
      if (!result) return;

      let zipCode = addr.zipCode || "";
      let state = "";
      for (const c of result.address_components || []) {
        if (c.types.includes("postal_code")) zipCode = c.long_name;
        if (c.types.includes("administrative_area_level_1")) {
          const full = US_STATE_MAP[c.short_name] || c.long_name?.toUpperCase() || c.short_name;
          state = ALLOWED_STATES.includes(full) ? full : "";
        }
      }
      const lat = result.geometry?.location?.lat;
      const long = result.geometry?.location?.lng;

      let patched: any = null;
      setLocations((prev) => {
        const updated = prev.map((l) => {
          if (l._key !== seedKey) return l;
          patched = {
            ...l,
            zipCode,
            state,
            lat: lat != null ? String(lat) : l.lat,
            long: long != null ? String(long) : l.long,
          };
          return patched;
        });
        return updated;
      });
      if (patched?.lat && patched?.long && patched?.zipCode && patched?.state) {
        checkAvailability(patched);
      }
    } catch {
      /* leave the seeded text fields as-is; cashier can search/fill manually */
    }
  }, [checkAvailability]);

  useEffect(() => {
    if (initialLocations?.length > 0) {
      initializedRef.current = true;
      const mapped = initialLocations.map((loc, i) => ({ ...loc, _key: loc._key ?? i }));
      setLocations(mapped);
      mapped.forEach((loc) => {
        if (loc.lat && loc.long && loc.zipCode && loc.state) checkAvailability(loc);
      });
    } else if (!initializedRef.current) {
      initializedRef.current = true;
      if (fallbackAddress?.streetAddress) {
        const seed = {
          ...emptyLocation(),
          streetAddress1: fallbackAddress.streetAddress,
          zipCode: fallbackAddress.zipCode || "",
        };
        setLocations([seed]);
        geocodeFallbackSeed(seed._key, fallbackAddress);
      } else {
        setLocations([emptyLocation()]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocations]);

  useEffect(() => {
    if (fieldErrors) setLocalErrors(fieldErrors);
  }, [fieldErrors]);

  const notify = (locs: any[]) => onChange?.(locs);

  const addLocation = () => {
    const updated = [...locations, emptyLocation()];
    setLocations(updated);
    notify(updated);
  };

  const removeLocation = (key: any) => {
    const updated = locations.filter((l) => l._key !== key);
    setLocations(updated);
    notify(updated);
  };

  const updateField = (key: any, field: string, value: any) => {
    setLocations((prev) => {
      const updated = prev.map((l) => (l._key === key ? { ...l, [field]: value } : l));
      notify(updated);
      return updated;
    });
    const idx = locations.findIndex((l) => l._key === key);
    if (idx !== -1 && localErrors[idx]?.[field]) {
      setLocalErrors((prev) => ({ ...prev, [idx]: { ...prev[idx], [field]: undefined } }));
    }
  };

  const updateFieldBatch = (key: any, fields: Record<string, any>) => {
    const currentLoc = locations.find((l) => l._key === key);
    const updatedLoc = currentLoc ? { ...currentLoc, ...fields } : null;

    setLocations((prev) => {
      const updated = prev.map((l) => (l._key === key ? { ...l, ...fields } : l));
      notify(updated);
      return updated;
    });

    if (updatedLoc) checkAvailability(updatedLoc);

    const idx = locations.findIndex((l) => l._key === key);
    if (idx !== -1) {
      setLocalErrors((prev) => {
        const locErrs = { ...prev[idx] };
        Object.keys(fields).forEach((f) => {
          locErrs[f] = undefined;
        });
        return { ...prev, [idx]: locErrs };
      });
    }
  };

  const saveLocations = async (locationsToSave?: any[]) => {
    if (!customerId) {
      toast.error("Customer ID is required");
      return;
    }
    const toSave = locationsToSave || locations;
    const missingState = toSave.some((loc) => !loc.state);
    if (missingState) {
      toast.error("State is required for all delivery locations");
      return;
    }
    setSaving(true);
    try {
      await setCustomerDeliveryLocations(
        customerId,
        toSave.map(({ _key, ...rest }) => rest),
      );
      toast.success("Delivery locations saved");
      toSave.forEach((loc) => checkAvailability(loc));

      if (onSave) {
        const savedWithMeta = toSave.map(({ _key, ...rest }) => {
          const tierExternalId = selectedTiers[_key];
          const avail = availability[_key];
          const tierObj = avail?.priorityTiers?.find((t: any) => t.externalId === tierExternalId);
          const slotId = selectedSlots[_key];
          const slotObj = avail?.availableSlots?.find((s: any) => s.id === slotId);
          return {
            ...rest,
            _selectedTier: tierExternalId || null,
            _tierName: tierObj?.name || null,
            _tierCharge: tierObj?.additionalCharge || 0,
            _scheduleForLater: scheduleForLater[_key] || false,
            _selectedSlot: slotId || null,
            _slotLabel: slotObj?.label || null,
            _slotDay: slotObj?.day || null,
            _slotFromTime: slotObj?.fromTime || null,
            _slotToTime: slotObj?.toTime || null,
          };
        });
        onSave(savedWithMeta);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.data?.message || "Failed to save delivery locations");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {locations.length === 0 && (
        <div className="rounded-lg bg-muted/40 py-8 text-center text-sm text-muted-foreground">
          No delivery locations added yet. Click &ldquo;Add Location&rdquo; to start.
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {locations.map((loc, index) => (
          <LocationCard
            key={loc._key}
            loc={loc}
            index={index + 1}
            onUpdate={(field: string, value: any) => updateField(loc._key, field, value)}
            onUpdateBatch={(fields: any) => updateFieldBatch(loc._key, fields)}
            onRemove={() => removeLocation(loc._key)}
            errors={localErrors[index]}
            availability={availability[loc._key] || null}
            onCheckAvailability={() => checkAvailability(loc)}
            selectedTier={selectedTiers[loc._key] || null}
            onTierChange={(tierId: string) =>
              setSelectedTiers((prev) => ({ ...prev, [loc._key]: tierId }))
            }
            scheduleForLater={scheduleForLater[loc._key] || false}
            onScheduleToggle={(val: boolean) =>
              setScheduleForLater((prev) => ({ ...prev, [loc._key]: val }))
            }
            selectedSlot={selectedSlots[loc._key] || null}
            onSlotChange={(slotId: string) =>
              setSelectedSlots((prev) => ({ ...prev, [loc._key]: slotId }))
            }
          />
        ))}
      </div>

      <Button variant="outline" onClick={addLocation} className="w-full">
        + Add Location
      </Button>

      {standalone && locations.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => saveLocations()} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Save Delivery Locations
          </Button>
        </div>
      )}
    </div>
  );
}
