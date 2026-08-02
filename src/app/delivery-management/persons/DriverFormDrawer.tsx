"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Truck, Upload, X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { useShop } from "@/context/shop-context";
import { createDriver } from "@/services/drivers/create";
import { updateDriver } from "@/services/drivers/update";
import { fetchSingleDriver } from "@/services/drivers/getSingle";
import { fetchCountryCodes } from "@/services/countries/list";
import { uploadAnySingleFile } from "@/services/storage/uploadFile";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface CountryOption {
  countryCode: string;
  countryName: string;
}

interface FormValues {
  name: string;
  license: string;
  ubi: string;
  email: string;
  countryCode: string;
  phone: string;
  avatarUrl: string | null;
  description: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

const EMPTY_VALUES: FormValues = {
  name: "",
  license: "",
  ubi: "",
  email: "",
  countryCode: "US",
  phone: "",
  avatarUrl: null,
  description: "",
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
};

interface DriverFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  driverId: string | number | null;
  onClose: () => void;
  onSaved: (driverId: string | number | null) => void;
}

function DocumentsUpload({ links, onChange }: { links: string[]; onChange: (links: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const res = await uploadAnySingleFile(file);
          return res?.downloadUrl || res?.url;
        })
      );
      onChange([...links, ...uploaded.filter(Boolean)]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload document");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {links.map((link, i) => (
        <div key={i} className="flex items-center justify-between rounded-md ring-1 ring-foreground/10 px-3 py-2">
          <a href={link} target="_blank" rel="noreferrer" className="truncate text-sm text-primary hover:underline">
            Document {i + 1}
          </a>
          <button
            type="button"
            onClick={() => onChange(links.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="flex h-16 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-muted-foreground border-muted-foreground/25 hover:bg-muted/30"
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Upload className="size-4" />
            <span className="text-sm">Upload documents</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function DriverFormDrawer({ open, mode, driverId, onClose, onSaved }: DriverFormDrawerProps) {
  const { shopId } = useShop();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [documentLinks, setDocumentLinks] = useState<string[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zipcodeError, setZipcodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchCountryCodes().then((res) => setCountries(res?.data ?? []));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === "add" || !driverId) {
      setValues(EMPTY_VALUES);
      setDocumentLinks([]);
      setZipcodeError(null);
      return;
    }

    setLoading(true);
    fetchSingleDriver(driverId, shopId as string)
      .then((res) => {
        const d = res?.data;
        if (!d) {
          toast.error("Driver not found");
          return;
        }
        setValues({
          name: d.name ?? "",
          license: d.license ?? "",
          ubi: d.ubi ?? "",
          email: d.email ?? "",
          countryCode: d.countryCode ?? "US",
          phone: d.phone?.replace(/^\+/, "") ?? "",
          avatarUrl: d.avatarUrl ?? null,
          description: d.description ?? "",
          streetAddress: d.locationDetails?.streetAddress ?? "",
          city: d.locationDetails?.city ?? "",
          state: d.locationDetails?.state ?? "",
          zipCode: d.locationDetails?.zipCode ?? "",
        });
        setDocumentLinks(d.documentLinks ?? []);
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load driver"))
      .finally(() => setLoading(false));
  }, [open, mode, driverId, shopId]);

  const handleZipCodeBlur = async () => {
    const zipCode = values.zipCode;
    if (!zipCode || !GOOGLE_MAPS_API_KEY) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        const components = data.results[0].address_components;
        let city = "";
        let state = "";
        for (const c of components) {
          if (c.types.includes("locality")) city = c.long_name;
          else if (c.types.includes("administrative_area_level_1")) state = c.short_name;
        }
        setValues((prev) => ({ ...prev, city, state }));
        setZipcodeError(null);
      } else {
        setZipcodeError("No results found for the provided ZIP code.");
      }
    } catch {
      setZipcodeError(null);
    }
  };

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Driver name is required");
      return;
    }
    if (!values.license.trim()) {
      toast.error("License number is required");
      return;
    }
    if (!values.streetAddress.trim()) {
      toast.error("Street address is required");
      return;
    }
    if (!values.zipCode.trim()) {
      toast.error("Zip code is required");
      return;
    }
    if (!values.city.trim()) {
      toast.error("City is required");
      return;
    }
    if (!values.state.trim()) {
      toast.error("State is required");
      return;
    }
    if (!shopId) return;

    setSaving(true);
    try {
      const country = countries.find((c) => c.countryCode === values.countryCode)?.countryName ?? null;
      const locationDetails: Record<string, any> = {};
      if (country) locationDetails.country = country;
      if (values.city) locationDetails.city = values.city;
      if (values.state) locationDetails.state = values.state;
      if (values.streetAddress) locationDetails.streetAddress = values.streetAddress;
      if (values.zipCode) locationDetails.zipCode = values.zipCode;

      const body = {
        name: values.name,
        license: values.license,
        ubi: values.ubi || undefined,
        email: values.email || undefined,
        countryCode: values.countryCode || undefined,
        phone: values.phone ? `+${values.phone}` : undefined,
        avatarUrl: values.avatarUrl,
        description: values.description || undefined,
        documentLinks,
        ...(Object.keys(locationDetails).length > 0 ? { locationDetails } : {}),
      };

      let savedId: string | number | null = driverId;
      if (mode === "add") {
        const res = await createDriver({ ...body, shopId });
        savedId = res?.data?.driver?._id ?? res?.data?.driver?.id ?? res?.data?._id ?? res?.data?.id ?? null;
        toast.success("Driver created successfully");
      } else {
        await updateDriver(driverId!, shopId, body);
        toast.success("Driver updated successfully");
      }
      onSaved(savedId);
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Truck className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{mode === "add" ? "Add Delivery Person" : "Edit Delivery Person"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new driver" : "Update driver details"}
            </div>
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
              <Field label="Driver Avatar">
                <SingleImageUpload imageUrl={values.avatarUrl} onChange={(avatarUrl) => setValues({ ...values, avatarUrl })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Driver Name" required>
                  <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Enter driver name" />
                </Field>

                <Field label="License Number" required>
                  <Input value={values.license} onChange={(e) => setValues({ ...values, license: e.target.value })} placeholder="Enter license number" />
                </Field>

                <Field label="UBI">
                  <Input value={values.ubi} onChange={(e) => setValues({ ...values, ubi: e.target.value })} placeholder="Enter UBI number" />
                </Field>

                <Field label="Email Address">
                  <Input
                    type="email"
                    value={values.email}
                    onChange={(e) => setValues({ ...values, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </Field>

                <Field label="Phone Number" className="col-span-2">
                  <PhoneInput
                    country="us"
                    enableSearch
                    value={values.phone}
                    onChange={(phone) => setValues({ ...values, phone })}
                    inputClass="!w-full !h-9"
                  />
                </Field>
              </div>

              <div className="text-sm font-semibold">Address</div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Street Address" required className="col-span-2">
                  <Input
                    value={values.streetAddress}
                    onChange={(e) => setValues({ ...values, streetAddress: e.target.value })}
                    placeholder="Enter street address"
                  />
                </Field>

                <Field label="Zip Code" required>
                  <Input
                    value={values.zipCode}
                    onChange={(e) => setValues({ ...values, zipCode: e.target.value })}
                    onBlur={handleZipCodeBlur}
                    placeholder="Enter zip code"
                  />
                </Field>

                <Field label="City" required>
                  <Input value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} placeholder="Auto-filled from zip code" />
                </Field>

                <Field label="State" required>
                  <Input value={values.state} onChange={(e) => setValues({ ...values, state: e.target.value })} placeholder="Auto-filled from zip code" />
                </Field>

                <Field label="Country">
                  <Select value={values.countryCode} onValueChange={(v) => setValues({ ...values, countryCode: v as string })}>
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
              </div>

              {zipcodeError && <p className="text-sm text-destructive">{zipcodeError}</p>}

              <Field label="Description">
                <Textarea
                  rows={3}
                  value={values.description}
                  onChange={(e) => setValues({ ...values, description: e.target.value })}
                  placeholder="Enter description..."
                />
              </Field>

              <Field label="Upload Documents">
                <DocumentsUpload links={documentLinks} onChange={setDocumentLinks} />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : mode === "add" ? "Save" : "Update"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
