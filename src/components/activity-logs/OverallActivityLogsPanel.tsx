"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { ArrowRight, Calendar, Link2, Loader2, Network, User } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchOverallActivityLogs } from "@/services/activityLogs/list";
import { fetchSingleActivityLog } from "@/services/activityLogs/getSingle";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 30;

type DateMode = "today" | "yesterday" | "custom";

interface ActivityLogEntry {
  id: string;
  action?: string;
  domain?: string;
  domainName?: string;
  domainDisplayId?: string;
  companionDomain?: string;
  companionDomainName?: string;
  companionDomainDisplayId?: string;
  level?: string;
  displayMessage?: string;
  creatorId?: string;
  creatorName?: string;
  createdAt?: string;
  [key: string]: any;
}

interface ChangeLogEntry {
  path: string;
  type: "modified" | "added" | "removed" | "type_changed";
  oldValue?: unknown;
  newValue?: unknown;
}

interface ActivityLogDetail extends ActivityLogEntry {
  changeLog?: ChangeLogEntry[];
}

const ACTION_BADGE_CLASSES: Record<string, string> = {
  ACTIVATED:
    "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  DEACTIVATED:
    "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  CREATE: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  FINISHED:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  DETACHED:
    "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  SOLD: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
};

const DEFAULT_ACTION_BADGE_CLASS =
  "bg-muted text-muted-foreground";

function getActionBadgeClass(action?: string) {
  return ACTION_BADGE_CLASSES[action?.toUpperCase() ?? ""] ?? DEFAULT_ACTION_BADGE_CLASS;
}

const TYPE_STYLES: Record<
  ChangeLogEntry["type"],
  { label: string; box: string; badge: string }
> = {
  modified: {
    label: "MODIFIED",
    box: "bg-blue-50 dark:bg-blue-950/20",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  added: {
    label: "ADDED",
    box: "bg-green-50 dark:bg-green-950/20",
    badge: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  },
  removed: {
    label: "REMOVED",
    box: "bg-red-50 dark:bg-red-950/20",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  },
  type_changed: {
    label: "TYPE CHANGED",
    box: "bg-amber-50 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
};

function formatDateTime(iso?: string) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getTodayRange() {
  const today = toDateStr(new Date());
  return { fromDate: today, toDate: today };
}

function getYesterdayRange() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const str = toDateStr(yesterday);
  return { fromDate: str, toDate: str };
}

function readCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userInfo") ?? "null")?.id ?? null;
  } catch {
    return null;
  }
}

function renderValue(val: unknown) {
  if (val === null || val === undefined) {
    return <span className="text-xs text-muted-foreground italic">null</span>;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined
    );
    if (entries.length === 0) {
      return <span className="text-xs text-muted-foreground italic">{"{}"}</span>;
    }
    return (
      <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
        {JSON.stringify(val, null, 2)}
      </pre>
    );
  }
  return (
    <span className="inline-block rounded bg-muted px-2 py-1 font-mono text-xs">
      {JSON.stringify(val)}
    </span>
  );
}

function ChangeLogEntryCard({ entry }: { entry: ChangeLogEntry }) {
  const style = TYPE_STYLES[entry.type] ?? TYPE_STYLES.modified;
  const isModified = entry.type === "modified";

  return (
    <div className={`space-y-2 rounded-lg p-3 ${style.box}`}>
      <div className="flex items-center justify-between gap-2">
        <code className="rounded bg-background px-2 py-0.5 text-xs font-bold ring-1 ring-foreground/10">
          {entry.path}
        </code>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {isModified ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Old value
            </p>
            {renderValue(entry.oldValue)}
          </div>
          <ArrowRight className="mt-5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              New value
            </p>
            {renderValue(entry.newValue)}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {entry.type === "removed" ? "Removed value" : "New value"}
          </p>
          {renderValue(entry.type === "removed" ? entry.oldValue : entry.newValue)}
        </div>
      )}
    </div>
  );
}

function DetailDialog({
  open,
  onClose,
  logId,
  shopId,
}: {
  open: boolean;
  onClose: () => void;
  logId: string | null;
  shopId: string | null;
}) {
  const [detail, setDetail] = useState<ActivityLogDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !logId || !shopId) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    (async () => {
      try {
        const res = await fetchSingleActivityLog(logId, shopId);
        const activityLog = res?.data?.data?.activityLog ?? null;
        if (!cancelled) setDetail(activityLog);
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || "Failed to load activity log details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, logId, shopId]);

  const changeLog = detail?.changeLog ?? [];
  const currentUserId = readCurrentUserId();
  const creatorLabel = detail && detail.creatorId === currentUserId ? "You" : detail?.creatorName;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity Log Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No details available.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 border-b pb-3">
              <Badge className={getActionBadgeClass(detail.action)}>{detail.action}</Badge>
              <Badge variant="outline">{detail.domain}</Badge>
              <Badge
                className={
                  detail.level === "INFO"
                    ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                }
              >
                {detail.level}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(detail.createdAt)}
              </span>
            </div>

            <p className="text-sm font-semibold">{detail.displayMessage}</p>

            <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Network className="size-3.5 text-muted-foreground" />
                <span className="w-28 shrink-0 text-muted-foreground">{detail.domain}:</span>
                <span className="font-semibold">{detail.domainName}</span>
              </div>
              <div className="flex items-center gap-2 pl-5.5">
                <span className="w-28 shrink-0 text-muted-foreground">{detail.domain} ID:</span>
                <code className="font-mono">{detail.domainDisplayId}</code>
              </div>
              {detail.companionDomain && (
                <>
                  <div className="mt-1 border-t pt-1.5" />
                  <div className="flex items-center gap-2">
                    <Link2 className="size-3.5 text-blue-500" />
                    <span className="w-28 shrink-0 text-blue-500">
                      TARGETED {detail.companionDomain}:
                    </span>
                    <span className="font-semibold">{detail.companionDomainName}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-5.5">
                    <span className="w-28 shrink-0 text-muted-foreground">
                      TARGETED {detail.companionDomain} ID:
                    </span>
                    <code className="font-mono">{detail.companionDomainDisplayId}</code>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="size-3.5" />
              <span className="font-medium text-foreground">{creatorLabel}</span>
            </div>

            {changeLog.length > 0 ? (
              <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 border-t pt-3 text-sm font-semibold">
                  <span>Change Log</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    {changeLog.length} field{changeLog.length !== 1 ? "s" : ""} changed
                  </span>
                </h4>
                <div className="space-y-2">
                  {changeLog.map((entry, i) => (
                    <ChangeLogEntryCard key={i} entry={entry} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No change log recorded for this entry.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LogCard({
  log,
  onDetails,
}: {
  log: ActivityLogEntry;
  onDetails: (id: string) => void;
}) {
  const currentUserId = readCurrentUserId();
  const creatorLabel = log.creatorId === currentUserId ? "You" : log.creatorName;
  const hasCompanion = !!log.companionDomain;

  return (
    <div className="space-y-3 rounded-xl p-4 shadow-sm ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`font-semibold uppercase tracking-wide ${getActionBadgeClass(log.action)}`}>
            {log.action}
          </Badge>
          <Badge variant="outline">{log.domain}</Badge>
          <Badge
            className={
              log.level === "INFO"
                ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
            }
          >
            {log.level}
          </Badge>
        </div>
        <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
          {formatDateTime(log.createdAt)}
        </span>
      </div>

      <p className="text-sm leading-relaxed font-semibold">{log.displayMessage}</p>

      <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-xs">
        <div className="flex items-center gap-2">
          <Network className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="w-24 shrink-0 font-medium text-muted-foreground">{log.domain}:</span>
          <span className="truncate font-semibold">{log.domainName}</span>
        </div>
        <div className="flex items-center gap-2 pl-5.5">
          <span className="w-24 shrink-0 text-muted-foreground">{log.domain} ID:</span>
          <code className="font-mono break-all">{log.domainDisplayId}</code>
        </div>

        {hasCompanion && (
          <>
            <div className="mt-1.5 border-t pt-1.5" />
            <div className="flex items-center gap-2">
              <Link2 className="size-3.5 shrink-0 text-blue-500" />
              <span className="w-24 shrink-0 font-medium text-blue-500">
                TARGETED {log.companionDomain}:
              </span>
              <span className="truncate font-semibold">{log.companionDomainName}</span>
            </div>
            <div className="flex items-center gap-2 pl-5.5">
              <span className="w-24 shrink-0 text-muted-foreground">
                TARGETED {log.companionDomain} ID:
              </span>
              <code className="font-mono break-all">{log.companionDomainDisplayId}</code>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="size-3.5" />
          <span className="font-medium text-foreground">{creatorLabel}</span>
        </div>
        <Button size="sm" onClick={() => onDetails(log.id)}>
          Details
        </Button>
      </div>
    </div>
  );
}

export interface OverallActivityLogsPanelProps {
  domain: string;
  targetId: string;
}

export function OverallActivityLogsPanel({ domain, targetId }: OverallActivityLogsPanelProps) {
  const { shopId } = useShop();

  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const buildDateParams = useCallback((): Record<string, string> => {
    if (dateMode === "today") return getTodayRange();
    if (dateMode === "yesterday") return getYesterdayRange();
    if (dateMode === "custom" && customRange?.from && customRange?.to) {
      return {
        fromDate: toDateStr(customRange.from),
        toDate: toDateStr(customRange.to),
      };
    }
    return {};
  }, [dateMode, customRange]);

  const fetchLogs = useCallback(
    async (pageToLoad: number) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = {
          page: pageToLoad,
          limit: PAGE_SIZE,
          shopId,
          domain,
          targetId,
          ...buildDateParams(),
        };
        const res = await fetchOverallActivityLogs(params);
        const body = res?.data?.data;
        setLogs(body?.activityLogs ?? []);
        setTotalEntries(body?.paginationData?.totalEntries ?? 0);
        setPage(pageToLoad);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load activity logs");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [shopId, domain, targetId, buildDateParams]
  );

  useEffect(() => {
    if (shopId) fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, domain, targetId, dateMode, customRange]);

  const handleOpenDetail = (id: string) => {
    setSelectedLogId(id);
    setDetailOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
        {(["today", "yesterday", "custom"] as DateMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setDateMode(mode)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              dateMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode}
          </button>
        ))}
        {dateMode === "custom" && (
          <DateRangePicker value={customRange} onChange={setCustomRange} className="ml-1" />
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No activity logs found.
          </div>
        ) : (
          logs.map((log) => <LogCard key={log.id} log={log} onDetails={handleOpenDetail} />)
        )}
      </div>

      {!loading && totalEntries > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          pageSize={PAGE_SIZE}
          loading={loading}
          onPageChange={(p) => fetchLogs(p)}
        />
      )}

      <DetailDialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedLogId(null);
        }}
        logId={selectedLogId}
        shopId={shopId}
      />
    </div>
  );
}

export default OverallActivityLogsPanel;
