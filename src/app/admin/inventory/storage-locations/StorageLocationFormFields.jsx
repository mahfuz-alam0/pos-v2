"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const YES_NO_FIELDS = [
  { key: "isSellableOnPhysicalStore", label: "Is Sellable In Physical Store" },
  { key: "isSellableOnOnlineStore", label: "Is Sellable In Online Store" },
  { key: "isOpenForAcceptingTransfers", label: "Default Package Destination" },
  { key: "isOpenForAcceptingReturns", label: "Is Open For Returns" },
];

export default function StorageLocationFormFields({ values, onChange }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Location Name</Label>
        <Input
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="Enter location name"
        />
      </div>

      {YES_NO_FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label>{field.label}</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={values[field.key] === true}
                onChange={() => onChange({ ...values, [field.key]: true })}
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={values[field.key] === false}
                onChange={() => onChange({ ...values, [field.key]: false })}
              />
              No
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
