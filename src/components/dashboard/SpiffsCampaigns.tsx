"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { fetchSpiffCampaigns } from "@/services/spiffs/list";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import CreateSpiffDialog, { ToggleGroup } from "@/components/spiffs/CreateSpiffDialog";
import SpiffCampaignActions from "@/components/spiffs/SpiffCampaignActions";

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline"> = { met: "default", missed: "destructive", progress: "outline" };
const STATUS_CLASS: Record<string, string> = { progress: "border-green-600 text-green-600 text-xs" };
const STATUS_LABEL: Record<string, string> = { met: "Goal Met", missed: "Missed", progress: "In Progress" };
const CADENCE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export default function SpiffsCampaigns() {
  const { shopId } = useShop();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(nowInShopTimezone().format("YYYY-MM-DD"));
  const [cadenceFilter, setCadenceFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
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

  return (
    <div className="rounded-xl bg-component-bg shadow-md p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-normal text-text">Spiffs &amp; Campaigns</span>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="flex h-8 items-center gap-1 rounded-full border border-primary/30 bg-component-bg px-3 text-sm font-medium text-[#2A9D8F]"
          >
            <ChevronLeft className="size-3" /> Previous
          </button>
          <span className="flex h-8 items-center rounded-full bg-surface-alt px-3 text-sm font-semibold text-[#2A9D8F]">
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
          </span>
          <button
            onClick={goToNext}
            disabled={isToday}
            className="flex h-8 items-center gap-1 rounded-full border px-3 text-sm font-medium disabled:cursor-not-allowed"
            style={{ borderColor: isToday ? "var(--border)" : "rgba(196,181,244,0.6)", color: isToday ? "var(--muted-foreground)" : "#2A9D8F" }}
          >
            Next <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <ToggleGroup options={CADENCE_OPTIONS} value={cadenceFilter} onChange={setCadenceFilter} />
        <Button
          className="my-1 h-8 px-3 text-sm"
          onClick={() => {
            setEditCampaignId(null);
            setModalOpen(true);
          }}
        >
          Create Spiff
        </Button>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">No spiffs match this filter for this day.</div>
        ) : (
          <Accordion multiple className="gap-1">
            {campaigns.map((campaign) => {
              const unitLabel = campaign.goalType === "revenue" ? "" : " units";
              const percent = Math.min(100, Math.round((campaign.value / campaign.goalValue) * 100));
              const sortedContributors = [...(campaign.contributors || [])].sort((a: any, b: any) => b.value - a.value);

              return (
                <AccordionItem key={campaign.id} value={campaign.id} className="not-last:border-b-0">
                  <AccordionTrigger
                    className="items-center py-2 hover:no-underline"
                    actions={
                      <SpiffCampaignActions
                        campaignId={campaign.campaignId}
                        onEdit={(id) => {
                          setEditCampaignId(id);
                          setModalOpen(true);
                        }}
                        onChanged={fetchCampaigns}
                      />
                    }
                  >
                    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 truncate font-semibold text-text">{campaign.title}</span>
                        <Badge variant={STATUS_VARIANT[campaign.status]} className={`shrink-0 text-sm ${STATUS_CLASS[campaign.status] ?? ""}`}>
                          {STATUS_LABEL[campaign.status]}
                        </Badge>
                        <span className="truncate text-sm text-muted-foreground">
                          {campaign.cadence} · {campaign.scopeType}: <strong>{campaign.scopeTarget}</strong> · {campaign.reward?.label}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold whitespace-nowrap">
                        {fmtValue(campaign.value, campaign.goalType)}
                        {unitLabel} / {fmtValue(campaign.goalValue, campaign.goalType)}
                        {unitLabel} · {Math.round((campaign.value / campaign.goalValue) * 100)}%
                      </span>
                      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full bg-primary ${percent > 0 ? "min-w-1" : ""}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="m-1 rounded-lg p-3 shadow-[0_1px_6px_rgba(0,0,0,0.08)]">
                      <p className="mb-3 text-muted-foreground">
                        {campaign.deal}
                        {campaign.result ? <span className="font-semibold text-text"> · {campaign.result}</span> : null}
                      </p>
                      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Contributors</p>
                      {sortedContributors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sales logged yet — check back soon.</p>
                      ) : (
                        <div className="mb-3 flex flex-col gap-2">
                          {sortedContributors.map((contributor: { id: string; name: string; value: number }, idx: number) => (
                            <div key={contributor.id} className="flex items-center gap-3">
                              <span className="max-w-62.5 shrink-0 truncate text-sm font-semibold" title={contributor.name}>
                                {idx === 0 ? "🏆 " : ""}
                                {contributor.name}
                              </span>
                              <div className="h-1.5 flex-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                                <div
                                  className="h-full"
                                  style={{ width: `${Math.min(100, Math.round((contributor.value / campaign.goalValue) * 100))}%`, background: "linear-gradient(90deg,#6EE8CE,#0E7C68)" }}
                                />
                              </div>
                              <span className="text-xs font-bold text-muted-foreground">
                                {fmtValue(contributor.value, campaign.goalType)}
                                {unitLabel}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{campaign.period}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <CreateSpiffDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        shopId={shopId}
        onCreated={fetchCampaigns}
        editCampaignId={editCampaignId}
      />
    </div>
  );
}
