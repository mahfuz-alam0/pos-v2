"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShop } from "@/context/shop-context";
import { fetchSpiffCampaigns } from "@/services/spiffs/list";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import CreateSpiffDialog from "@/components/spiffs/CreateSpiffDialog";
import SpiffCampaignActions from "@/components/spiffs/SpiffCampaignActions";

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline"> = { met: "default", missed: "destructive", progress: "outline" };
const STATUS_LABEL: Record<string, string> = { met: "Goal Met", missed: "Missed", progress: "In Progress" };

const fmtValue = (value: number, goalType: string) =>
  goalType === "revenue" ? formatCurrency(value) : Math.round(value).toLocaleString("en-US");

// Groups the campaign-centric /spiffs/list response by contributor so each employee's
// spiff activity for the day can be reviewed in one place. Keyed by contributor id, not
// display name, so employees sharing a name never get merged together.
function groupByEmployee(campaigns: any[]) {
  const byEmployee = new Map<string, { id: string; name: string; campaigns: any[] }>();
  for (const campaign of campaigns) {
    for (const contributor of campaign.contributors || []) {
      if (!byEmployee.has(contributor.id)) byEmployee.set(contributor.id, { id: contributor.id, name: contributor.name, campaigns: [] });
      byEmployee.get(contributor.id)!.campaigns.push({ ...campaign, contribution: contributor.value });
    }
  }
  return [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
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
    <div className="flex gap-4 p-3">
      <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card px-4 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
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
            className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
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
            <SelectTrigger className="h-10! w-52">
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

        <div className="relative -mx-4 px-4">
          {loading ? (
            <div className="py-6 text-center text-muted-foreground">Loading…</div>
          ) : visibleEmployees.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {employeeFilter ? "This employee hasn't contributed to a spiff in this range." : "No employee has contributed to a spiff in this range."}
            </div>
          ) : (
            <Accordion multiple className="gap-1">
              {visibleEmployees.map((employee) => {
                const metCount = employee.campaigns.filter((c) => c.status === "met").length;
                return (
                  <AccordionItem key={employee.id} value={employee.id} className="not-last:border-b-0">
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
                        {employee.campaigns.map((campaign) => {
                          const unitLabel = campaign.goalType === "revenue" ? "" : " units";
                          return (
                            <div key={campaign.id} className="flex items-center justify-between gap-3 not-last:border-b not-last:border-foreground/5 not-last:pb-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 truncate font-medium text-text">{campaign.title}</span>
                                <Badge variant={STATUS_VARIANT[campaign.status]} className="shrink-0 text-xs">
                                  {STATUS_LABEL[campaign.status]}
                                </Badge>
                                <span className="truncate text-xs text-muted-foreground">{campaign.reward?.label}</span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-sm font-semibold whitespace-nowrap">
                                  {fmtValue(campaign.contribution, campaign.goalType)}
                                  {unitLabel} contributed
                                </span>
                                <SpiffCampaignActions
                                  campaignId={campaign.campaignId}
                                  onEdit={(id) => {
                                    setEditCampaignId(id);
                                    setModalOpen(true);
                                  }}
                                  onChanged={fetchCampaigns}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
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
