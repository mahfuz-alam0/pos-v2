"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
        <Label className="text-gray-700">
          Location Name <span className="text-destructive">*</span>
        </Label>
        <Input
          className="h-10"
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="Enter location name"
        />
      </div>

      {YES_NO_FIELDS.map((field) => (
        <div key={field.key} className="mt-2 flex flex-col gap-1.5">
          <Label className="text-muted-foreground">
            <span className="text-destructive">*</span> {field.label}
          </Label>
          <div className="flex gap-4">
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((option) => (
              <label key={option.label} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  className="accent-primary"
                  name={field.key}
                  checked={!!values[field.key] === option.value}
                  onChange={() => onChange({ ...values, [field.key]: option.value } as StorageLocationBase)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
