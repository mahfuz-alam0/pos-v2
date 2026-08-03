"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useShop } from "@/context/shop-context";
import { fetchSpiffCampaigns } from "@/services/spiffs/list";
import { createSpiffCampaign } from "@/services/spiffs/create";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchProductsList } from "@/services/products/list";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ApiSelect } from "@/components/ui/api-select";

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline"> = { met: "default", missed: "destructive", progress: "outline" };
const STATUS_LABEL: Record<string, string> = { met: "Goal Met", missed: "Missed", progress: "In Progress" };
const CADENCE_OPTIONS = [
  { label: "All", value: "all" },
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

function ToggleGroup({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-component-bg text-muted-foreground hover:text-text"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function SpiffsCampaigns() {
  const { shopId } = useShop();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(nowInShopTimezone().format("YYYY-MM-DD"));
  const [cadenceFilter, setCadenceFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchCampaigns = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchSpiffCampaigns({
        shopId,
        startDate: date,
        endDate: date,
        ...(cadenceFilter !== "all" ? { cadence: cadenceFilter } : {}),
      });
      setCampaigns(res?.data?.campaigns || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, date, cadenceFilter]);

  const shiftDate = (deltaDays: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  };
  const goToPrev = () => setDate(shiftDate(-1));
  const goToNext = () => {
    const next = shiftDate(1);
    if (next <= nowInShopTimezone().format("YYYY-MM-DD")) setDate(next);
  };
  const isToday = date === nowInShopTimezone().format("YYYY-MM-DD");

  const fmtValue = (value: number, goalType: string) =>
    goalType === "revenue" ? formatCurrency(value) : Math.round(value).toLocaleString("en-US");

  const openModal = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.scopeTargetId) {
      toast.error("Please fill in the campaign name and target.");
      return;
    }
    setSubmitting(true);
    try {
      await createSpiffCampaign({ shopId: shopId as string, ...form, scopeTargetId: form.scopeTargetId, scopeTargetName: form.scopeTargetName as string });
      toast.success("Spiff created");
      setModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create spiff");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-component-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-semibold text-text">Spiffs &amp; Campaigns</span>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-component-bg px-3 py-1 text-sm font-medium text-[#2A9D8F]"
          >
            <ChevronLeft className="size-3" /> Previous
          </button>
          <span className="rounded-full bg-surface-alt px-3 py-1 text-sm font-semibold text-[#2A9D8F]">
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
          </span>
          <button
            onClick={goToNext}
            disabled={isToday}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium disabled:cursor-not-allowed"
            style={{ borderColor: isToday ? "var(--border)" : "rgba(196,181,244,0.6)", color: isToday ? "var(--muted-foreground)" : "#2A9D8F" }}
          >
            Next <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <ToggleGroup options={CADENCE_OPTIONS} value={cadenceFilter} onChange={setCadenceFilter} />
        <Button size="sm" onClick={openModal}>
          <Plus className="size-4" /> New Spiff
        </Button>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">No spiffs match this filter for this day.</div>
        ) : (
          <Accordion multiple>
            {campaigns.map((campaign) => {
              const unitLabel = campaign.goalType === "revenue" ? "" : " units";
              const percent = Math.min(100, Math.round((campaign.value / campaign.goalValue) * 100));
              const sortedContributors = [...(campaign.contributors || [])].sort((a: any, b: any) => b[1] - a[1]);
              const maxContrib = sortedContributors.reduce((m: number, row: any) => Math.max(m, row[1]), 1);

              return (
                <AccordionItem key={campaign.id} value={campaign.id}>
                  <AccordionTrigger>
                    <div className="w-full">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{campaign.scopeType}</Badge>
                        <Badge variant="outline">{campaign.cadence}</Badge>
                        <Badge variant={STATUS_VARIANT[campaign.status]}>{STATUS_LABEL[campaign.status]}</Badge>
                      </div>
                      <div className="font-semibold text-text">{campaign.title}</div>
                      <div className="my-1 text-xs text-muted-foreground">
                        {campaign.scopeType.charAt(0).toUpperCase() + campaign.scopeType.slice(1)}: <strong>{campaign.scopeTarget}</strong>
                        {" · "}Reward: <strong>{campaign.reward?.label}</strong>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={percent} className="flex-1" />
                        <span className="text-xs font-semibold whitespace-nowrap">
                          {fmtValue(campaign.value, campaign.goalType)}
                          {unitLabel} / {fmtValue(campaign.goalValue, campaign.goalType)}
                          {unitLabel} · {Math.round((campaign.value / campaign.goalValue) * 100)}%
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">{campaign.deal}</p>
                    <div className="mb-4 rounded-lg p-2.5 text-xs font-semibold bg-surface-alt text-text">{campaign.result}</div>
                    <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Contributors</p>
                    {sortedContributors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sales logged yet — check back soon.</p>
                    ) : (
                      <div className="mb-3 flex flex-col gap-2">
                        {sortedContributors.map(([name, value]: [string, number], idx: number) => (
                          <div key={name} className="flex items-center gap-3">
                            <span className="w-37.5 shrink-0 truncate text-sm font-semibold">
                              {idx === 0 ? "🏆 " : ""}
                              {name}
                            </span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded bg-surface-alt">
                              <div
                                className="h-full"
                                style={{ width: `${Math.round((value / maxContrib) * 100)}%`, background: "linear-gradient(90deg,#6EE8CE,#0E7C68)" }}
                              />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">
                              {fmtValue(value, campaign.goalType)}
                              {unitLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{campaign.period}</p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Spiff</DialogTitle>
          </DialogHeader>

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
                onChange={(value, option) => setForm((prev) => ({ ...prev, scopeTargetId: value as string | null, scopeTargetName: option?.name ?? null }))}
                fetchPage={SCOPE_FETCHERS[form.scopeType]}
                triggerClassName="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Cadence</Label>
              <ToggleGroup options={CADENCE_OPTIONS.filter((o) => o.value !== "all")} value={form.cadence} onChange={(value) => setForm((prev) => ({ ...prev, cadence: value }))} />
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating…" : "Create Spiff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
