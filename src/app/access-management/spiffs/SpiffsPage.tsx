"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { fetchSpiffCampaigns } from "@/services/spiffs/list";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import CreateSpiffDialog, { ACTION_BUTTON } from "@/components/spiffs/CreateSpiffDialog";
import SpiffCampaignActions from "@/components/spiffs/SpiffCampaignActions";
import SpiffPayoutsTable from "@/components/spiffs/SpiffPayoutsTable";

const TAB_LABEL_CLASS =
  "h-auto flex-none -mb-px rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 pb-3 text-sm font-normal text-foreground/70 after:hidden focus-visible:border-b-primary focus-visible:ring-0 focus-visible:outline-none data-active:border-primary";

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline"> = { met: "default", missed: "destructive", progress: "outline" };
const STATUS_LABEL: Record<string, string> = { met: "Goal Met", missed: "Missed", progress: "In Progress" };

const fmtValue = (value: number, goalType: string) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return goalType === "revenue" ? formatCurrency(safeValue) : Math.round(safeValue).toLocaleString("en-US");
};

// Groups the campaign-centric /spiffs/list response by contributor, then by campaign, so each
// employee's row is "how is this spiff going overall" rather than one row per calendar day. A
// daily-cadence campaign resets its goal every day and the API returns one entry per day in the
// selected range — flattening that straight into the list (as this used to do) turned 3 real
// campaigns into 39 near-identical "Missed" rows. Aggregating first, with the day-by-day detail
// available on demand, is what actually reads as "3 spiffs" at a glance.
function groupByEmployee(campaigns: any[]) {
  const byEmployee = new Map<string, { id: string; name: string; byCampaign: Map<string, any> }>();

  for (const campaign of campaigns) {
    for (const contributor of campaign.contributors || []) {
      if (!byEmployee.has(contributor.id)) {
        byEmployee.set(contributor.id, { id: contributor.id, name: contributor.name, byCampaign: new Map() });
      }
      const employee = byEmployee.get(contributor.id)!;
      if (!employee.byCampaign.has(campaign.campaignId)) {
        employee.byCampaign.set(campaign.campaignId, {
          campaignId: campaign.campaignId,
          title: campaign.title,
          goalType: campaign.goalType,
          reward: campaign.reward,
          days: [] as any[],
        });
      }
      employee.byCampaign.get(campaign.campaignId)!.days.push({ ...campaign, contribution: contributor.value });
    }
  }

  return [...byEmployee.values()]
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      campaigns: [...employee.byCampaign.values()].map((c) => {
        const totalContribution = c.days.reduce((sum: number, d: any) => sum + (Number.isFinite(d.contribution) ? d.contribution : 0), 0);
        const metCount = c.days.filter((d: any) => d.status === "met").length;
        const missedCount = c.days.filter((d: any) => d.status === "missed").length;
        const progressCount = c.days.filter((d: any) => d.status === "progress").length;
        return {
          ...c,
          totalContribution,
          metCount,
          missedCount,
          progressCount,
          // Most recent day first — enumerateCadencePeriods hands the API days back oldest-first.
          days: [...c.days].reverse(),
        };
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// One campaign's summary row for an employee — daily/weekly/monthly rollup collapsed to a single
// line, with the underlying per-period rows available behind a toggle instead of always shown.
function CampaignSummaryRow({
  campaign,
  onEdit,
  onChanged,
}: {
  campaign: any;
  onEdit: (id: string) => void;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const unitLabel = campaign.goalType === "revenue" ? "" : " units";
  const isSingleDay = campaign.days.length === 1;

  return (
    <div className="not-last:pb-2 not-last:shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => !isSingleDay && setExpanded((v) => !v)}
        >
          <span className="shrink-0 truncate font-medium text-text">{campaign.title}</span>
          {isSingleDay ? (
            <Badge variant={STATUS_VARIANT[campaign.days[0].status]} className="shrink-0 text-xs">
              {STATUS_LABEL[campaign.days[0].status]}
            </Badge>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-xs">
              {campaign.metCount > 0 && <span className="font-semibold text-emerald-600">{campaign.metCount} met</span>}
              {campaign.missedCount > 0 && <span className="font-semibold text-destructive">{campaign.missedCount} missed</span>}
              {campaign.progressCount > 0 && <span className="font-semibold text-muted-foreground">{campaign.progressCount} in progress</span>}
            </span>
          )}
          <span className="truncate text-xs text-muted-foreground">{campaign.reward?.label}</span>
          {!isSingleDay && (
            <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold whitespace-nowrap">
            {fmtValue(campaign.totalContribution, campaign.goalType)}
            {unitLabel} contributed
          </span>
          <SpiffCampaignActions campaignId={campaign.campaignId} onEdit={onEdit} onChanged={onChanged} />
        </div>
      </div>

      {!isSingleDay && expanded && (
        <div className="mt-2 ml-4 flex flex-col gap-1.5 border-l border-foreground/10 pl-3">
          {campaign.days.map((day: any) => (
            <div key={day.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{day.period}</span>
                <Badge variant={STATUS_VARIANT[day.status]} className="text-xs">
                  {STATUS_LABEL[day.status]}
                </Badge>
              </div>
              <span className="font-medium">
                {fmtValue(day.contribution, day.goalType)}
                {unitLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpiffsPage() {
  const { shopId } = useShop();
  const searchParams = useSearchParams();
  const today = nowInShopTimezone().format("YYYY-MM-DD");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Deep-link support: EmployeeDetailPanel's "View full history" link lands here pre-filtered
  // to that employee — default to This Month in that case so it's not just an empty "Today".
  // Otherwise default to "All" (no bound), matching every other list page's "show everything
  // by default" convention.
  const linkedEmployeeId = searchParams.get("employeeId");
  const [range, setRange] = useState<SelectedDateResult>(() =>
    linkedEmployeeId
      ? { startDate: today.slice(0, 8) + "01", endDate: today, timeEnabled: false }
      : { startDate: null, endDate: null, timeEnabled: false }
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState(linkedEmployeeId ?? "");

  // The backend requires concrete startDate/endDate — "All" has no real lower bound, so it's
  // approximated with a recent window rather than left unbounded.
  // ponytail: capped at 90 days, not truly "all time" — the backend expands every day of the
  // requested range into its own query for daily-cadence campaigns (enumerateCadencePeriods),
  // so a decade-long "All" turns into thousands of DB round trips and effectively hangs. Raise
  // this once the backend can answer "all time" from a materialized rollup instead of computing
  // every day live.
  const allTimeStart = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  })();

  const fetchCampaigns = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchSpiffCampaigns({
        shopId,
        startDate: range.startDate ?? allTimeStart,
        endDate: range.endDate ?? today,
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
  }, [shopId, range.startDate, range.endDate]);

  const employees = useMemo(() => groupByEmployee(campaigns), [campaigns]);
  const visibleEmployees = employeeFilter ? employees.filter((e) => e.id === employeeFilter) : employees;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Access Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">Spiffs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            className={ACTION_BUTTON}
            onClick={() => {
              setEditCampaignId(null);
              setModalOpen(true);
            }}
          >
            Create Spiff
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DateRangeSelector
            setSelectedDate={setRange}
            initialDate={{ startDate: range.startDate, endDate: range.endDate }}
            availableOptions={["All", "Today", "Yesterday", "Last 7 Days", "This Month", "Last Month", "Custom Range"]}
            showAllOption
          />
          <Select
            items={[{ value: "", label: "All Employees" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
            value={employeeFilter}
            onValueChange={setEmployeeFilter}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="leaderboard">
          <div className="shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
            <TabsList variant="line" className="h-auto gap-7 p-0">
              <TabsTrigger value="leaderboard" className={TAB_LABEL_CLASS}>
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="payouts" className={TAB_LABEL_CLASS}>
                Payouts
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="leaderboard" className="relative mt-4">
            {loading ? (
              <div className="py-6 text-center text-muted-foreground">Loading…</div>
            ) : visibleEmployees.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                {employeeFilter ? "This employee hasn't contributed to a spiff in this range." : "No employee has contributed to a spiff in this range."}
              </div>
            ) : (
              <Accordion multiple className="gap-1">
                {visibleEmployees.map((employee) => {
                  const metCount = employee.campaigns.filter((c) => c.metCount > 0).length;
                  return (
                    <AccordionItem
                      key={employee.id}
                      value={employee.id}
                      className="not-last:border-b-0 not-last:shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]"
                    >
                      <AccordionTrigger className="items-center py-2 hover:no-underline">
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="truncate font-semibold text-text">{employee.name}</span>
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {employee.campaigns.length} spiff{employee.campaigns.length === 1 ? "" : "s"} · {metCount} met
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="m-1 flex flex-col gap-2 p-3">
                          {employee.campaigns.map((campaign) => (
                            <CampaignSummaryRow
                              key={campaign.campaignId}
                              campaign={campaign}
                              onEdit={(id) => {
                                setEditCampaignId(id);
                                setModalOpen(true);
                              }}
                              onChanged={fetchCampaigns}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="payouts" className="mt-4">
            <SpiffPayoutsTable shopId={shopId} startDate={range.startDate} endDate={range.endDate} employeeFilter={employeeFilter} />
          </TabsContent>
        </Tabs>
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
