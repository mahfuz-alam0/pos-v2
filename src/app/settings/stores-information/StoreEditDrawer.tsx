"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { fetchSingleShop } from "@/services/shops/getSingle";
import { updateShop } from "@/services/shops/update";
import { fetchCountryCodes } from "@/services/countries/list";
import { fetchTimezones } from "@/services/timezones/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";
import type { CountryOption, TimezoneOption } from "./types";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface FormValues {
  storeName: string;
  phone: string;
  emailId: string;
  webSite: string;
  currency: string;
  countryCode: string;
  cannabisLicenceNo: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  lat: string;
  long: string;
  timeZone: string;
  logo: string | null;
  open24X7: boolean;
}

const EMPTY_VALUES: FormValues = {
  storeName: "",
  phone: "",
  emailId: "",
  webSite: "",
  currency: "USD",
  countryCode: "US",
  cannabisLicenceNo: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  lat: "",
  long: "",
  timeZone: "",
  logo: null,
  open24X7: false,
};

type OperationSlots = Record<string, { from: string; to: string; disabled: boolean }>;

const DEFAULT_SLOTS: OperationSlots = Object.fromEntries(
  DAYS.map((day) => [day, { from: "09:00", to: "17:00", disabled: false }]),
);

interface StoreEditDrawerProps {
  open: boolean;
  storeId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StoreEditDrawer({ open, storeId, onClose, onSaved }: StoreEditDrawerProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [slots, setSlots] = useState<OperationSlots>(DEFAULT_SLOTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchCountryCodes().then((res) => setCountries(res?.data ?? []));
    fetchTimezones().then((res) => setTimezones(res?.data ?? []));
  }, [open]);

  useEffect(() => {
    if (!open || !storeId) return;
    setLoading(true);
    fetchSingleShop(storeId)
      .then((res) => {
        const s = res?.data;
        if (!s) {
          toast.error("Store not found");
          return;
        }
        setValues({
          storeName: s.shopName ?? "",
          phone: s.phone ?? "",
          emailId: s.shopEmail ?? "",
          webSite: s.webSite ?? "",
          currency: s.currency ?? "USD",
          countryCode: s.countryCode ?? "US",
          cannabisLicenceNo: s.licenseDetails?.licenseId ?? "",
          address: s.locationDetails?.streetAddress ?? "",
          city: s.locationDetails?.city ?? "",
          state: s.locationDetails?.state ?? "",
          zipCode: s.locationDetails?.zipCode ?? "",
          lat: s.lat ?? "",
          long: s.long ?? "",
          timeZone: s.timeZone ?? "",
          logo: s.logo ?? null,
          open24X7: !!s.operationHours?.open24X7,
        });
        if (s.operationHours?.slots) {
          const loaded: OperationSlots = {};
          DAYS.forEach((day) => {
            const slot = s.operationHours.slots[day];
            loaded[day] = slot?.disabled
              ? { from: "09:00", to: "17:00", disabled: true }
              : { from: to24h(slot?.from) ?? "09:00", to: to24h(slot?.to) ?? "17:00", disabled: false };
          });
          setSlots(loaded);
        }
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load store"))
      .finally(() => setLoading(false));
  }, [open, storeId]);

  const handleSave = async () => {
    if (!values.storeName.trim()) {
      toast.error("Please enter a store name");
      return;
    }
    setSaving(true);
    try {
      const country = countries.find((c) => c.countryCode === values.countryCode)?.countryName ?? null;
      const operationHours: Record<string, { from: string; to: string; disabled: boolean }> = {};
      DAYS.forEach((day) => {
        operationHours[day] = values.open24X7
          ? { from: "12:01 AM", to: "11:59 PM", disabled: true }
          : { from: to12h(slots[day].from), to: to12h(slots[day].to), disabled: slots[day].disabled };
      });

      const body = {
        shopName: values.storeName,
        phone: values.phone ? (values.phone.startsWith("+") ? values.phone : `+${values.phone}`) : undefined,
        shopEmail: values.emailId || undefined,
        webSite: values.webSite || undefined,
        currency: values.currency,
        countryCode: values.countryCode,
        country,
        streetAddress: values.address || undefined,
        lat: values.lat || undefined,
        long: values.long || undefined,
        timeZone: values.timeZone || undefined,
        logo: values.logo ?? undefined,
        operationHours: { open24X7: values.open24X7, slots: operationHours },
        licenseDetails: {
          licenseId: values.cannabisLicenceNo || undefined,
        },
      };
      await updateShop(storeId!, body);
      toast.success("Store information updated successfully");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Store className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Edit Store Information</div>
            <div className="text-xs leading-tight text-muted-foreground">Update store details</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Logo">
                <SingleImageUpload imageUrl={values.logo} onChange={(logo) => setValues({ ...values, logo })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Store Name" required>
                  <Input value={values.storeName} onChange={(e) => setValues({ ...values, storeName: e.target.value })} />
                </Field>

                <Field label="Country">
                  <Select value={values.countryCode} onValueChange={(v) => setValues({ ...values, countryCode: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.countryCode} value={c.countryCode}>
                          {c.countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Phone Number">
                  <PhoneInput country="us" value={values.phone} onChange={(phone) => setValues({ ...values, phone })} inputClass="!w-full !h-9" />
                </Field>

                <Field label="Email Address">
                  <Input type="email" value={values.emailId} onChange={(e) => setValues({ ...values, emailId: e.target.value })} />
                </Field>

                <Field label="Website">
                  <Input value={values.webSite} onChange={(e) => setValues({ ...values, webSite: e.target.value })} />
                </Field>

                <Field label="Currency">
                  <Select value={values.currency} onValueChange={(v) => setValues({ ...values, currency: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">(USD) US Dollar</SelectItem>
                      <SelectItem value="CAD">(CAD) Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="text-sm font-semibold">Licence Details</div>
              <Field label="Dispensary Licence No.">
                <Input value={values.cannabisLicenceNo} onChange={(e) => setValues({ ...values, cannabisLicenceNo: e.target.value })} />
              </Field>

              <div className="text-sm font-semibold">Store Location Detail</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Street" className="col-span-2">
                  <Input value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} />
                </Field>
                <Field label="City">
                  <Input value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} />
                </Field>
                <Field label="State">
                  <Input value={values.state} onChange={(e) => setValues({ ...values, state: e.target.value })} />
                </Field>
                <Field label="Zip Code">
                  <Input value={values.zipCode} onChange={(e) => setValues({ ...values, zipCode: e.target.value })} />
                </Field>
                <Field label="Time Zone">
                  <Select value={values.timeZone} onValueChange={(v) => setValues({ ...values, timeZone: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.timezone} value={tz.timezone}>
                          {tz.name} ({tz.gmtOffSet})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Latitude">
                  <Input value={values.lat} onChange={(e) => setValues({ ...values, lat: e.target.value })} />
                </Field>
                <Field label="Longitude">
                  <Input value={values.long} onChange={(e) => setValues({ ...values, long: e.target.value })} />
                </Field>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Opening Hours</div>
                <label className="flex items-center gap-2 text-sm">
                  Open 24/7
                  <Switch checked={values.open24X7} onCheckedChange={(open24X7) => setValues({ ...values, open24X7 })} />
                </label>
              </div>

              {!values.open24X7 && (
                <div className="flex flex-col gap-2">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-10 text-sm text-muted-foreground">{day}</span>
                      <Input
                        type="time"
                        className="w-full"
                        value={slots[day].from}
                        onChange={(e) => setSlots({ ...slots, [day]: { ...slots[day], from: e.target.value } })}
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        className="w-full"
                        value={slots[day].to}
                        onChange={(e) => setSlots({ ...slots, [day]: { ...slots[day], to: e.target.value } })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function to24h(time?: string): string | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return null;
  let [, h, m, meridiem] = match;
  let hour = parseInt(h, 10);
  if (meridiem.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (meridiem.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${m}`;
}

function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const meridiem = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${meridiem}`;
}
