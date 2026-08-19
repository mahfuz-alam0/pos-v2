"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createSpiffCampaign } from "@/services/spiffs/create";
import { updateSpiffCampaign } from "@/services/spiffs/update";
import { fetchSpiffCampaign } from "@/services/spiffs/getSingle";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchProductsList } from "@/services/products/list";
import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
import { Field } from "@/components/admin/form-fields";

export const CADENCE_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];
const SCOPE_OPTIONS = [
  { label: "Brand", value: "brand" },
  { label: "Category", value: "category" },
  { label: "Product", value: "product" },
];
const GOAL_TYPE_OPTIONS = [
  { label: "Units", value: "units" },
  { label: "Revenue", value: "revenue" },
];
const REWARD_TYPE_OPTIONS = [
  { label: "Per unit", value: "perUnit" },
  { label: "Flat bonus", value: "flat" },
];

/** Matches the page-level "Create Spiff" button in SpiffsPage. */
export const ACTION_BUTTON = "h-9! rounded! px-3.5! text-[14px]! font-normal!";

const emptyForm = {
  name: "",
  scopeType: "brand",
  scopeTargetId: null as string | null,
  scopeTargetName: null as string | null,
  cadence: "daily",
  goalType: "units",
  goalValue: 30,
  rewardType: "perUnit",
  rewardValue: 2,
};

const SCOPE_FETCHERS: Record<string, (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>> = {
  brand: async (page, search) => {
    const res = await fetchBrandsList({ page, limit: 20, search });
    return { items: res?.data?.map((b: any) => ({ id: String(b.id), name: b.name })) ?? [], totalPages: res?.paginationData?.totalPages ?? 1 };
  },
  category: async (page, search) => {
    const res = await fetchCategoriesList({ page, limit: 20, search });
    return { items: res?.data?.map((c: any) => ({ id: String(c.id), name: c.name })) ?? [], totalPages: res?.paginationData?.totalPages ?? 1 };
  },
  product: async (page, search) => {
    const res = await fetchProductsList({ page, limit: 20, search });
    return { items: res?.data?.map((p: any) => ({ id: String(p.id), name: p.name })) ?? [], totalPages: res?.paginationData?.totalPages ?? 1 };
  },
};

export function ToggleGroup({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex w-fit flex-wrap items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[7px] px-3 py-1 text-sm font-medium transition-colors ${
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function CreateSpiffDialog({
  open,
  onOpenChange,
  shopId,
  onCreated,
  editCampaignId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string | null | undefined;
  onCreated: () => void;
  /** When set, the dialog loads and edits this campaign instead of creating a new one. */
  editCampaignId?: string | null;
}) {
  const isEditing = Boolean(editCampaignId);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;

    if (!editCampaignId) {
      setForm(emptyForm);
      return;
    }

    setLoading(true);
    fetchSpiffCampaign(editCampaignId)
      .then((res) => {
        const c = res?.data?.campaign;
        if (!c) return;
        setForm({
          name: c.name,
          scopeType: c.scopeType,
          scopeTargetId: c.scopeTargetId,
          scopeTargetName: c.scopeTargetName,
          cadence: c.cadence,
          goalType: c.goalType,
          goalValue: c.goalValue,
          rewardType: c.rewardType,
          rewardValue: c.rewardValue,
        });
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load spiff"))
      .finally(() => setLoading(false));
  }, [open, editCampaignId]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.scopeTargetId) {
      toast.error("Please fill in the campaign name and target.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, scopeTargetId: form.scopeTargetId, scopeTargetName: form.scopeTargetName as string };
      if (isEditing) {
        await updateSpiffCampaign(editCampaignId as string, payload);
        toast.success("Spiff updated");
      } else {
        await createSpiffCampaign({ shopId: shopId as string, ...payload });
        toast.success("Spiff created");
      }
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${isEditing ? "update" : "create"} spiff`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : () => onOpenChange(false)} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base leading-tight font-semibold">{isEditing ? "Edit Spiff" : "New Spiff"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {isEditing ? "Update campaign details" : "Create a new spiff campaign"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : (
        <div className="flex flex-col gap-4">
          <Field label="Campaign name" required>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Push the New Drop" />
          </Field>

          <Field label="Scope">
            <ToggleGroup
              options={SCOPE_OPTIONS}
              value={form.scopeType}
              onChange={(value) => setForm((prev) => ({ ...prev, scopeType: value, scopeTargetId: null, scopeTargetName: null }))}
            />
          </Field>

          <Field label="Target" required>
            <ApiSelect
              key={form.scopeType}
              placeholder={`Select ${form.scopeType}`}
              value={form.scopeTargetId}
              initialLabel={form.scopeTargetName ?? undefined}
              onChange={(value, option) => setForm((prev) => ({ ...prev, scopeTargetId: value as string | null, scopeTargetName: option?.name ?? null }))}
              fetchPage={SCOPE_FETCHERS[form.scopeType]}
              triggerClassName="w-full"
            />
          </Field>

          <Field label="Cadence">
            <ToggleGroup options={CADENCE_OPTIONS} value={form.cadence} onChange={(value) => setForm((prev) => ({ ...prev, cadence: value }))} />
          </Field>

          <div className="flex gap-3">
            <Field label="Goal metric" className="flex-1">
              <ToggleGroup options={GOAL_TYPE_OPTIONS} value={form.goalType} onChange={(value) => setForm((prev) => ({ ...prev, goalType: value }))} />
            </Field>
            <Field label="Goal value" className="flex-1">
              <Input type="number" min={1} value={form.goalValue} onChange={(e) => setForm((prev) => ({ ...prev, goalValue: Number(e.target.value) }))} />
            </Field>
          </div>

          <div className="flex gap-3">
            <Field label="Reward type" className="flex-1">
              <ToggleGroup options={REWARD_TYPE_OPTIONS} value={form.rewardType} onChange={(value) => setForm((prev) => ({ ...prev, rewardType: value }))} />
            </Field>
            <Field label="Reward value ($)" className="flex-1">
              <Input type="number" min={1} value={form.rewardValue} onChange={(e) => setForm((prev) => ({ ...prev, rewardValue: Number(e.target.value) }))} />
            </Field>
          </div>
        </div>
        )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" className={ACTION_BUTTON} onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button className={ACTION_BUTTON} onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save Changes" : "Create Spiff"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
