"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createSpiffCampaign } from "@/services/spiffs/create";
import { updateSpiffCampaign } from "@/services/spiffs/update";
import { fetchSpiffCampaign } from "@/services/spiffs/getSingle";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchProductsList } from "@/services/products/list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ApiSelect } from "@/components/ui/api-select";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Spiff" : "New Spiff"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Loading…</div>
        ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Campaign name</Label>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Push the New Drop" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Scope</Label>
            <ToggleGroup
              options={SCOPE_OPTIONS}
              value={form.scopeType}
              onChange={(value) => setForm((prev) => ({ ...prev, scopeType: value, scopeTargetId: null, scopeTargetName: null }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Target</Label>
            <ApiSelect
              key={form.scopeType}
              placeholder={`Select ${form.scopeType}`}
              value={form.scopeTargetId}
              initialLabel={form.scopeTargetName ?? undefined}
              onChange={(value, option) => setForm((prev) => ({ ...prev, scopeTargetId: value as string | null, scopeTargetName: option?.name ?? null }))}
              fetchPage={SCOPE_FETCHERS[form.scopeType]}
              triggerClassName="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cadence</Label>
            <ToggleGroup options={CADENCE_OPTIONS} value={form.cadence} onChange={(value) => setForm((prev) => ({ ...prev, cadence: value }))} />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Goal metric</Label>
              <ToggleGroup options={GOAL_TYPE_OPTIONS} value={form.goalType} onChange={(value) => setForm((prev) => ({ ...prev, goalType: value }))} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Goal value</Label>
              <Input type="number" min={1} value={form.goalValue} onChange={(e) => setForm((prev) => ({ ...prev, goalValue: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Reward type</Label>
              <ToggleGroup options={REWARD_TYPE_OPTIONS} value={form.rewardType} onChange={(value) => setForm((prev) => ({ ...prev, rewardType: value }))} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Reward value ($)</Label>
              <Input type="number" min={1} value={form.rewardValue} onChange={(e) => setForm((prev) => ({ ...prev, rewardValue: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save Changes" : "Create Spiff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
