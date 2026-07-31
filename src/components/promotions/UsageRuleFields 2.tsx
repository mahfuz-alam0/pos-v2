"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/form-fields";

export interface EachUsageRule {
  isEnabled: boolean;
  value: number;
}

export interface UsageRuleValue {
  isApplicable: boolean;
  minimumOrderAmount: EachUsageRule;
  totalUsageLimit: EachUsageRule;
  totalUsageLimitPerUser: EachUsageRule;
  maximumApplicableDiscount: EachUsageRule;
}

const EMPTY_RULE: EachUsageRule = { isEnabled: false, value: 0 };

export const EMPTY_USAGE_RULE: UsageRuleValue = {
  isApplicable: false,
  minimumOrderAmount: { ...EMPTY_RULE },
  totalUsageLimit: { ...EMPTY_RULE },
  totalUsageLimitPerUser: { ...EMPTY_RULE },
  maximumApplicableDiscount: { ...EMPTY_RULE },
};

function Row({
  label,
  rule,
  onChange,
}: {
  label: string;
  rule: EachUsageRule;
  onChange: (rule: EachUsageRule) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3 ring-1 ring-foreground/10">
      <Switch checked={rule.isEnabled} onCheckedChange={(c) => onChange({ ...rule, isEnabled: !!c })} />
      <div className="flex-1 text-sm font-medium">{label}</div>
      {rule.isEnabled && (
        <Input
          type="number"
          min={0}
          className="h-8 w-32"
          value={rule.value}
          onChange={(e) => onChange({ ...rule, value: Number(e.target.value) })}
        />
      )}
    </div>
  );
}

export function UsageRuleFields({
  value,
  onChange,
  showMinimumOrderAmount = false,
}: {
  value: UsageRuleValue;
  onChange: (patch: Partial<UsageRuleValue>) => void;
  showMinimumOrderAmount?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Apply Usage Rules</div>
          <div className="text-xs text-muted-foreground">Turn on to configure usage limits and minimums</div>
        </div>
        <Switch checked={value.isApplicable} onCheckedChange={(c) => onChange({ isApplicable: !!c })} />
      </div>

      {value.isApplicable && (
        <div className="flex flex-col gap-3">
          {showMinimumOrderAmount && (
            <Field label="Minimum Order Amount">
              <Row
                label="Require a minimum order amount"
                rule={value.minimumOrderAmount}
                onChange={(rule) => onChange({ minimumOrderAmount: rule })}
              />
            </Field>
          )}
          <Field label="Total Usage Limit">
            <Row
              label="Limit total number of uses"
              rule={value.totalUsageLimit}
              onChange={(rule) => onChange({ totalUsageLimit: rule })}
            />
          </Field>
          <Field label="Usage Limit Per Customer">
            <Row
              label="Limit uses per customer"
              rule={value.totalUsageLimitPerUser}
              onChange={(rule) => onChange({ totalUsageLimitPerUser: rule })}
            />
          </Field>
          <Field label="Maximum Applicable Discount">
            <Row
              label="Cap the maximum discount amount"
              rule={value.maximumApplicableDiscount}
              onChange={(rule) => onChange({ maximumApplicableDiscount: rule })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
