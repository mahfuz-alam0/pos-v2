"use client";

import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/admin/form-fields";
import { MultiApiSelect, type MultiApiSelectOption } from "@/components/ui/multi-api-select";
import {
  SALE_SOURCE_ITEMS,
  DELIVERY_METHOD_ITEMS,
  type SelectItem,
} from "@/services/promotions/enums";
import { fetchAllCustomerTypes, fetchAllCustomerGroups, fetchCustomersPage } from "@/services/promotions/pickerAdapters";

export interface RestrictionsValue {
  shouldConsiderCustomerTypes: boolean;
  allowedCustomerTypeIds: string[];
  shouldConsiderCustomerGroups: boolean;
  allowedCustomerGroupIds: string[];
  allowAllSaleSources: boolean;
  allowedSaleSources: string[];
  allowAllDeliveryMethods: boolean;
  allowedDeliveryMethods: string[];
  allowedStacks: string[];
  shouldTargetSetOfCustomers: boolean;
  targetedCustomerIds: string[];
}

export const EMPTY_RESTRICTIONS: RestrictionsValue = {
  shouldConsiderCustomerTypes: false,
  allowedCustomerTypeIds: [],
  shouldConsiderCustomerGroups: false,
  allowedCustomerGroupIds: [],
  allowAllSaleSources: true,
  allowedSaleSources: [],
  allowAllDeliveryMethods: true,
  allowedDeliveryMethods: [],
  allowedStacks: [],
  shouldTargetSetOfCustomers: false,
  targetedCustomerIds: [],
};

export function RestrictionsFields({
  value,
  onChange,
  stackItems,
}: {
  value: RestrictionsValue;
  onChange: (patch: Partial<RestrictionsValue>) => void;
  stackItems: SelectItem[];
}) {
  const [customerTypes, setCustomerTypes] = useState<MultiApiSelectOption[]>([]);
  const [customerGroups, setCustomerGroups] = useState<MultiApiSelectOption[]>([]);

  useEffect(() => {
    fetchAllCustomerTypes().then(setCustomerTypes);
    fetchAllCustomerGroups().then(setCustomerGroups);
  }, []);

  const toggleStack = (val: string) => {
    onChange({
      allowedStacks: value.allowedStacks.includes(val)
        ? value.allowedStacks.filter((s) => s !== val)
        : [...value.allowedStacks, val],
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Restrict by Customer Type</div>
          <div className="text-xs text-muted-foreground">Only allow specific customer types</div>
        </div>
        <Switch
          checked={value.shouldConsiderCustomerTypes}
          onCheckedChange={(c) => onChange({ shouldConsiderCustomerTypes: !!c })}
        />
      </div>
      {value.shouldConsiderCustomerTypes && (
        <Field label="Customer Types">
          <MultiApiSelect
            placeholder="Select customer types"
            items={customerTypes}
            value={value.allowedCustomerTypeIds}
            onChange={(ids) => onChange({ allowedCustomerTypeIds: ids })}
            triggerClassName="w-full"
          />
        </Field>
      )}

      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Restrict by Customer Group</div>
          <div className="text-xs text-muted-foreground">Only allow specific customer groups</div>
        </div>
        <Switch
          checked={value.shouldConsiderCustomerGroups}
          onCheckedChange={(c) => onChange({ shouldConsiderCustomerGroups: !!c })}
        />
      </div>
      {value.shouldConsiderCustomerGroups && (
        <Field label="Customer Groups">
          <MultiApiSelect
            placeholder="Select customer groups"
            items={customerGroups}
            value={value.allowedCustomerGroupIds}
            onChange={(ids) => onChange({ allowedCustomerGroupIds: ids })}
            triggerClassName="w-full"
          />
        </Field>
      )}

      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Target Specific Customers</div>
          <div className="text-xs text-muted-foreground">Only these customers can use this promotion</div>
        </div>
        <Switch
          checked={value.shouldTargetSetOfCustomers}
          onCheckedChange={(c) => onChange({ shouldTargetSetOfCustomers: !!c })}
        />
      </div>
      {value.shouldTargetSetOfCustomers && (
        <Field label="Customers" required>
          <MultiApiSelect
            placeholder="Search customers"
            fetchPage={fetchCustomersPage}
            value={value.targetedCustomerIds}
            onChange={(ids) => onChange({ targetedCustomerIds: ids })}
            triggerClassName="w-full"
          />
        </Field>
      )}

      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Allow All Sale Sources</div>
          <div className="text-xs text-muted-foreground">Applies to internal POS, Weedmaps, Leafly, etc.</div>
        </div>
        <Switch
          checked={value.allowAllSaleSources}
          onCheckedChange={(c) => onChange({ allowAllSaleSources: !!c })}
        />
      </div>
      {!value.allowAllSaleSources && (
        <Field label="Sale Sources">
          <MultiApiSelect
            placeholder="Select sale sources"
            items={SALE_SOURCE_ITEMS.map((i) => ({ id: i.value, name: i.label }))}
            value={value.allowedSaleSources}
            onChange={(ids) => onChange({ allowedSaleSources: ids })}
            triggerClassName="w-full"
          />
        </Field>
      )}

      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Allow All Delivery Methods</div>
          <div className="text-xs text-muted-foreground">In-store, pick-up, delivery, shipment</div>
        </div>
        <Switch
          checked={value.allowAllDeliveryMethods}
          onCheckedChange={(c) => onChange({ allowAllDeliveryMethods: !!c })}
        />
      </div>
      {!value.allowAllDeliveryMethods && (
        <Field label="Delivery Methods">
          <MultiApiSelect
            placeholder="Select delivery methods"
            items={DELIVERY_METHOD_ITEMS.map((i) => ({ id: i.value, name: i.label }))}
            value={value.allowedDeliveryMethods}
            onChange={(ids) => onChange({ allowedDeliveryMethods: ids })}
            triggerClassName="w-full"
          />
        </Field>
      )}

      <Field label="Allow Stacking With">
        <div className="flex flex-col gap-2">
          {stackItems.map((item) => (
            <label key={item.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={value.allowedStacks.includes(item.value)} onCheckedChange={() => toggleStack(item.value)} />
              {item.label}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
