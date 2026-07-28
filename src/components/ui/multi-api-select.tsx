"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface MultiApiSelectOption {
  id: string;
  name: string;
}

interface MultiApiSelectProps {
  placeholder?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Static option list — filtered locally by search, no pagination. */
  items?: MultiApiSelectOption[];
  /** Paginated remote source — mutually exclusive with `items`. */
  fetchPage?: (page: number, search: string) => Promise<{ items: MultiApiSelectOption[]; totalPages: number }>;
  triggerClassName?: string;
}

export function MultiApiSelect({ placeholder = "Select...", value, onChange, items, fetchPage, triggerClassName }: MultiApiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [remoteItems, setRemoteItems] = React.useState<MultiApiSelectOption[]>([]);
  const [labelMap, setLabelMap] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  const isStatic = !fetchPage;

  const load = React.useCallback(
    async (targetPage: number, term: string, replace: boolean) => {
      if (!fetchPage) return;
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await fetchPage(targetPage, term);
        setRemoteItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setLabelMap((prev) => {
          const next = { ...prev };
          res.items.forEach((item) => (next[item.id] = item.name));
          return next;
        });
        setTotalPages(res.totalPages || 1);
        setPage(targetPage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [fetchPage]
  );

  React.useEffect(() => {
    if (isStatic) {
      const next: Record<string, string> = {};
      items?.forEach((item) => (next[item.id] = item.name));
      setLabelMap(next);
      return;
    }
    if (!open) return;
    load(1, debouncedSearch, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedSearch, isStatic, items]);

  const handleScroll = () => {
    if (isStatic) return;
    const el = listRef.current;
    if (!el || loading || loadingMore || page >= totalPages) return;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 24) {
      load(page + 1, debouncedSearch, false);
    }
  };

  const visibleItems = isStatic
    ? (items ?? []).filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : remoteItems;

  const toggle = (item: MultiApiSelectOption) => {
    const exists = value.includes(item.id);
    onChange(exists ? value.filter((id) => id !== item.id) : [...value, item.id]);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (labelMap[value[0]] ?? "1 selected")
        : `${value.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-48 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30",
          triggerClassName
        )}
      >
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>{label}</span>
        <span className="flex items-center gap-1">
          {value.length > 0 && <X className="size-3.5 text-muted-foreground hover:text-foreground" onClick={clearAll} />}
          <ChevronDown className="size-4 text-muted-foreground" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5" align="start">
        <Input autoFocus placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-1.5 h-8" />
        <div ref={listRef} onScroll={handleScroll} className="max-h-56 overflow-y-auto">
          {!isStatic && loading && (
            <div className="flex justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {(isStatic || !loading) && visibleItems.length === 0 && (
            <div className="py-3 text-center text-sm text-muted-foreground">No results</div>
          )}
          {(isStatic || !loading) &&
            visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item)}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Checkbox checked={value.includes(item.id)} />
                <span className="truncate">{item.name}</span>
                {value.includes(item.id) && <Check className="ml-auto size-3.5 shrink-0" />}
              </button>
            ))}
          {!isStatic && loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
