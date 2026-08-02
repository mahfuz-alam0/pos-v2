"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Car, Loader2, Upload, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { createVehicle } from "@/services/vehicles/create";
import { updateVehicle } from "@/services/vehicles/update";
import { fetchSingleVehicle } from "@/services/vehicles/getSingle";
import { uploadAnySingleFile } from "@/services/storage/uploadFile";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/admin/form-fields";

interface FormValues {
  name: string;
  make: string;
  model: string;
  color: string;
  licensePlateData: string;
  vin: string;
  description: string;
}

const EMPTY_VALUES: FormValues = {
  name: "",
  make: "",
  model: "",
  color: "",
  licensePlateData: "",
  vin: "",
  description: "",
};

interface VehicleFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  vehicleId: string | number | null;
  onClose: () => void;
  onSaved: (vehicleId: string | number | null) => void;
}

function FilesUpload({
  links,
  onChange,
  accept,
  label,
}: {
  links: string[];
  onChange: (links: string[]) => void;
  accept: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (links.length + files.length > 3) {
      toast.error("Max 3 files allowed");
      return;
    }
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
      toast.error(err?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {links.map((link, i) => (
        <div key={i} className="flex items-center justify-between rounded-md px-3 py-2 ring-1 ring-foreground/10">
          <a href={link} target="_blank" rel="noreferrer" className="truncate text-sm text-primary hover:underline">
            {label} {i + 1}
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
      {links.length < 3 && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex h-16 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:bg-muted/30"
        >
          <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Upload className="size-4" />
              <span className="text-sm">Upload {label.toLowerCase()}s (max 3)</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function VehicleFormDrawer({ open, mode, vehicleId, onClose, onSaved }: VehicleFormDrawerProps) {
  const { shopId } = useShop();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [isActive, setIsActive] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [documentLinks, setDocumentLinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add" || !vehicleId) {
      setValues(EMPTY_VALUES);
      setIsActive(false);
      setImages([]);
      setDocumentLinks([]);
      return;
    }

    setLoading(true);
    fetchSingleVehicle(vehicleId, shopId as string)
      .then((res) => {
        const v = res?.data;
        if (!v) {
          toast.error("Vehicle not found");
          return;
        }
        setValues({
          name: v.name ?? "",
          make: v.make ?? "",
          model: v.model ?? "",
          color: v.color ?? "",
          licensePlateData: v.licensePlateData ?? "",
          vin: v.vin ?? "",
          description: v.description ?? "",
        });
        setIsActive(v.isActive ?? false);
        setImages(v.images ?? []);
        setDocumentLinks(v.documentLinks ?? []);
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load vehicle"))
      .finally(() => setLoading(false));
  }, [open, mode, vehicleId, shopId]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter vehicle name!");
      return;
    }
    if (!values.make.trim()) {
      toast.error("Please enter make!");
      return;
    }
    if (!values.model.trim()) {
      toast.error("Please enter model!");
      return;
    }
    if (!values.color.trim()) {
      toast.error("Please enter color!");
      return;
    }
    if (!values.licensePlateData.trim()) {
      toast.error("Please enter license plate!");
      return;
    }
    if (!shopId) return;

    setSaving(true);
    try {
      const body = {
        name: values.name,
        make: values.make,
        model: values.model,
        color: values.color,
        licensePlateData: values.licensePlateData,
        isActive,
        images,
        documentLinks,
        ...(values.vin ? { vin: values.vin } : {}),
        ...(values.description ? { description: values.description } : {}),
      };

      let savedId: string | number | null = vehicleId;
      if (mode === "add") {
        const res = await createVehicle({ ...body, shopId });
        savedId =
          res?.data?.vehicle?._id ?? res?.data?.vehicle?.id ?? res?.data?._id ?? res?.data?.id ?? null;
        toast.success("Vehicle created successfully");
      } else {
        await updateVehicle(vehicleId!, shopId, body);
        toast.success("Vehicle updated successfully");
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
            <Car className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Delivery Vehicle" : "Edit Vehicle"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new delivery vehicle" : "Update vehicle details"}
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vehicle Name" required className="col-span-2">
                  <Input
                    value={values.name}
                    onChange={(e) => setValues({ ...values, name: e.target.value })}
                    placeholder="e.g. Delivery Van 1"
                  />
                </Field>

                <Field label="Make" required>
                  <Input value={values.make} onChange={(e) => setValues({ ...values, make: e.target.value })} placeholder="e.g. Toyota" />
                </Field>

                <Field label="Model" required>
                  <Input value={values.model} onChange={(e) => setValues({ ...values, model: e.target.value })} placeholder="e.g. Sienna" />
                </Field>

                <Field label="Color" required>
                  <Input value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })} placeholder="e.g. White" />
                </Field>

                <Field label="License Plate" required>
                  <Input
                    value={values.licensePlateData}
                    onChange={(e) => setValues({ ...values, licensePlateData: e.target.value })}
                    placeholder="e.g. ABC-1234"
                  />
                </Field>

                <Field label="VIN" className="col-span-2">
                  <Input value={values.vin} onChange={(e) => setValues({ ...values, vin: e.target.value })} placeholder="Enter Vehicle Identification Number" />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-sm font-medium">Active Status</p>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? "Vehicle is active and available for delivery" : "Vehicle is inactive"}
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <Field label="Vehicle Images">
                <FilesUpload links={images} onChange={setImages} accept="image/*" label="Image" />
              </Field>

              <Field label="Identification Document">
                <FilesUpload links={documentLinks} onChange={setDocumentLinks} accept="image/*,application/pdf" label="Document" />
              </Field>

              <Field label="Description">
                <Textarea
                  rows={3}
                  value={values.description}
                  onChange={(e) => setValues({ ...values, description: e.target.value })}
                  placeholder="Enter any additional notes about this vehicle..."
                />
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
