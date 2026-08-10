"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

interface ApiSelectOption {
  id: string | number;
  name: string;
}

interface ApiSelectProps {
  placeholder?: string;
  value: string | number | null;
  onChange: (value: string | number | null, option: ApiSelectOption | null) => void;
  fetchPage: (
    page: number,
    search: string
  ) => Promise<{ items: ApiSelectOption[]; totalPages: number }>;
  className?: string;
  triggerClassName?: string;
  /** Seeds the displayed label when `value` is set from outside the dropdown
   * (e.g. right after creating a new record elsewhere and pre-selecting it),
   * since the popup's own item list won't have been opened/loaded yet. */
  initialLabel?: string;
  /** Pins a "+ {createLabel}" row above the list, e.g. to open an inline
   * create-new-brand panel without leaving the dropdown. */
  onCreateNew?: () => void;
  createLabel?: string;
}

export function ApiSelect({
  placeholder = "Select...",
  value,
  onChange,
  fetchPage,
  className,
  triggerClassName,
  initialLabel,
  onCreateNew,
  createLabel = "Create New",
}: ApiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [items, setItems] = React.useState<ApiSelectOption[]>([]);
  const [selectedLabel, setSelectedLabel] = React.useState<string | null>(initialLabel ?? null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(
    async (targetPage: number, term: string, replace: boolean) => {
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await fetchPage(targetPage, term);
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
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
    if (!open) return;
    load(1, debouncedSearch, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedSearch]);

  React.useEffect(() => {
    if (value == null) setSelectedLabel(null);
    else if (initialLabel) setSelectedLabel(initialLabel);
  }, [value, initialLabel]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || loading || loadingMore || page >= totalPages) return;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 24) {
      load(page + 1, debouncedSearch, false);
    }
  };

  const handleSelect = (item: ApiSelectOption) => {
    onChange(item.id, item);
    setSelectedLabel(item.name);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setSelectedLabel(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-48 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30",
          triggerClassName
        )}
      >
        <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel ?? placeholder}
        </span>
        <span className="flex items-center gap-1">
          {selectedLabel && (
            <X className="size-3.5 text-muted-foreground hover:text-foreground" onClick={handleClear} />
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </span>
      </PopoverTrigger>
      <PopoverContent className={cn("w-56 p-1.5", className)} align="start">
        <Input
          autoFocus
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-1.5 h-8"
        />
        {onCreateNew && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateNew();
            }}
            className="mb-1 flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-sm font-medium text-primary hover:bg-muted"
          >
            <Plus className="size-3.5" /> {createLabel}
          </button>
        )}
        <div ref={listRef} onScroll={handleScroll} className="max-h-56 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="py-3 text-center text-sm text-muted-foreground">No results</div>
          )}
          {!loading &&
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="flex w-full items-center justify-between gap-1.5 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{item.name}</span>
                {value === item.id && <Check className="size-3.5 shrink-0" />}
              </button>
            ))}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
