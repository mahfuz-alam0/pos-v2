"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { createSupplier } from "@/services/suppliers/create";
import { updateSupplier } from "@/services/suppliers/update";
import { fetchSingleSupplier } from "@/services/suppliers/getSingle";
import { fetchSupplierTypes } from "@/services/supplierTypes/list";
import { fetchCountryCodes } from "@/services/countries/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentsUpload, Field, SingleImageUpload } from "@/components/admin/form-fields";
import type { CountryOption, SupplierTypeOption } from "./types";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface FormValues {
  name: string;
  supplierTypeId: string;
  license: string;
  ubi: string;
  email: string;
  countryCode: string;
  phone: string;
  logo: string | null;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

const EMPTY_VALUES: FormValues = {
  name: "",
  supplierTypeId: "",
  license: "",
  ubi: "",
  email: "",
  countryCode: "US",
  phone: "",
  logo: null,
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
};

interface SupplierFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  supplierId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SupplierFormDrawer({ open, mode, supplierId, onClose, onSaved }: SupplierFormDrawerProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [documentLinks, setDocumentLinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierTypes, setSupplierTypes] = useState<SupplierTypeOption[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [zipcodeError, setZipcodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchSupplierTypes().then((res) => setSupplierTypes(res?.data ?? []));
    fetchCountryCodes().then((res) => setCountries(res?.data ?? []));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      setDocumentLinks([]);
      return;
    }

    if (mode === "edit" && supplierId) {
      setLoading(true);
      fetchSingleSupplier(supplierId)
        .then((res) => {
          const s = res?.data;
          if (!s) {
            toast.error("Supplier not found");
            return;
          }
          setValues({
            name: s.name ?? "",
            supplierTypeId: s.supplierTypeId ? String(s.supplierTypeId) : "",
            license: s.license ?? "",
            ubi: s.ubi ?? "",
            email: s.email ?? "",
            countryCode: s.countryCode ?? "US",
            phone: s.phone ?? "",
            logo: s.logo ?? null,
            streetAddress: s.locationDetails?.streetAddress ?? "",
            city: s.locationDetails?.city ?? "",
            state: s.locationDetails?.state ?? "",
            zipCode: s.locationDetails?.zipCode ?? "",
          });
          setDocumentLinks(s.documentLinks ?? []);
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load supplier"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, supplierId]);

  const handleZipCodeBlur = async () => {
    const zipCode = values.zipCode;
    if (!zipCode || !GOOGLE_MAPS_API_KEY) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&key=${GOOGLE_MAPS_API_KEY}`,
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
      toast.error("Please enter a supplier name");
      return;
    }
    if (!values.supplierTypeId) {
      toast.error("Please select a supplier type");
      return;
    }
    setSaving(true);
    try {
      const country = countries.find((c) => c.countryCode === values.countryCode)?.countryName ?? null;
      const body = {
        name: values.name,
        supplierTypeId: values.supplierTypeId,
        license: values.license || undefined,
        ubi: values.ubi || undefined,
        email: values.email || undefined,
        countryCode: values.countryCode || undefined,
        phone: values.phone ? `+${values.phone}` : undefined,
        logo: values.logo ?? undefined,
        documentLinks,
        locationDetails: {
          country,
          city: values.city || undefined,
          state: values.state || undefined,
          streetAddress: values.streetAddress || undefined,
          zipCode: values.zipCode || undefined,
        },
      };
      if (mode === "add") {
        await createSupplier(body);
        toast.success("Supplier created successfully");
      } else {
        await updateSupplier(supplierId!, body);
        toast.success("Supplier updated successfully");
      }
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
            <Truck className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Supplier" : "Edit Supplier"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new supplier" : "Update supplier details"}
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
              <Field label="Supplier Image">
                <SingleImageUpload imageUrl={values.logo} onChange={(logo) => setValues({ ...values, logo })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Supplier Name" required>
                  <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
                </Field>

                <Field label="Supplier Type" required>
                  <Select
                    value={values.supplierTypeId}
                    onValueChange={(v) => setValues({ ...values, supplierTypeId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select supplier type" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="License Number">
                  <Input value={values.license} onChange={(e) => setValues({ ...values, license: e.target.value })} />
                </Field>

                <Field label="UBI">
                  <Input value={values.ubi} onChange={(e) => setValues({ ...values, ubi: e.target.value })} />
                </Field>

                <Field label="Email Address">
                  <Input
                    type="email"
                    value={values.email}
                    onChange={(e) => setValues({ ...values, email: e.target.value })}
                  />
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

                <Field label="Phone Number" className="col-span-2">
                  <PhoneInput
                    country="us"
                    value={values.phone}
                    onChange={(phone) => setValues({ ...values, phone })}
                    inputClass="!w-full !h-9"
                  />
                </Field>
              </div>

              <div className="text-sm font-semibold">Address</div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Street" className="col-span-2">
                  <Input
                    value={values.streetAddress}
                    onChange={(e) => setValues({ ...values, streetAddress: e.target.value })}
                  />
                </Field>

                <Field label="Zip Code">
                  <Input
                    value={values.zipCode}
                    onChange={(e) => setValues({ ...values, zipCode: e.target.value })}
                    onBlur={handleZipCodeBlur}
                  />
                </Field>

                <Field label="City">
                  <Input value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} />
                </Field>

                <Field label="State">
                  <Input value={values.state} onChange={(e) => setValues({ ...values, state: e.target.value })} />
                </Field>
              </div>

              {zipcodeError && <p className="text-sm text-destructive">{zipcodeError}</p>}

              <Field label="Documents">
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
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
