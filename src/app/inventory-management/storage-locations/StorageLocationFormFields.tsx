"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const YES_NO_FIELDS: { key: string; label: string }[] = [
  { key: "isSellableOnPhysicalStore", label: "Is Sellable In Physical Store" },
  { key: "isSellableOnOnlineStore", label: "Is Sellable In Online Store" },
  { key: "isOpenForAcceptingTransfers", label: "Default Package Destination" },
  { key: "isOpenForAcceptingReturns", label: "Is Open For Returns" },
];

export interface StorageLocationBase {
  name: string;
  isSellableOnPhysicalStore: boolean;
  isSellableOnOnlineStore: boolean;
  isOpenForAcceptingTransfers: boolean;
  isOpenForAcceptingReturns: boolean;
}

interface StorageLocationFormFieldsProps {
  values: StorageLocationBase;
  onChange: (values: StorageLocationBase) => void;
}

export default function StorageLocationFormFields({ values, onChange }: StorageLocationFormFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>
          Location Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="Enter location name"
        />
      </div>

      {YES_NO_FIELDS.map((field) => (
        <div key={field.key} className="flex items-center justify-between rounded-lg border border-input px-4 py-3">
          <Label className="cursor-pointer text-sm font-medium">{field.label}</Label>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground min-w-[24px] text-right">
              {values[field.key] ? "Yes" : "No"}
            </span>
            <Switch
              checked={!!values[field.key]}
              onCheckedChange={(checked) => onChange({ ...values, [field.key]: checked } as StorageLocationBase)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
