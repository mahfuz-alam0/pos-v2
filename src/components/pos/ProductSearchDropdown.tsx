"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { listInventories } from "@/services/inventories/listInventories";

const PAGE_LIMIT = 20;

// Ported from posModule/ProductDropdown.js — the "Search and select
// products..." typeahead next to the barcode scanner. Same endpoint, same
// filters (limit/page/isActive/search/sortByAlpha), same behaviour: a plain
// "Product - Brand" label (no price in the row) and a "Load More (N
// remaining)" footer that appends the next page, rather than a flat 20-item
// cap. A selected result already has everything ProductDetailPanel needs
// (no extra fetch).
export default function ProductSearchDropdown({ onSelectProduct, disabled = false }) {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalEntries: 0 });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const mountedRef = useRef(true);
  const searchValueRef = useRef("");
  // Guards against out-of-order responses: only the most recently *fired*
  // search is allowed to apply its results.
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = (value, page = 1) => {
    const requestId = ++requestIdRef.current;
    searchValueRef.current = value;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    listInventories([
      { name: "limit", value: PAGE_LIMIT },
      { name: "page", value: page },
      { name: "isActive", value: true },
      { name: "sortByAlpha", value: 1 },
      ...(value.trim() ? [{ name: "search", value: value.trim() }] : []),
    ])
      .then((res) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        const inventories = res?.data?.data?.inventories || [];
        const p = res?.data?.data?.paginationData || {};
        setOptions((prev) => (page === 1 ? inventories : [...prev, ...inventories]));
        setPagination({
          currentPage: p.currentPage || page,
          totalPages: p.totalPages || 1,
          totalEntries: p.totalEntries || inventories.length,
        });
        setHighlightedIndex(-1);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch((error) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setLoading(false);
        setLoadingMore(false);
        toast.error(error?.message || "Failed to search products");
      });
  };

  const loadMore = () => search(searchValueRef.current, pagination.currentPage + 1);

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value, 1), 300);
  };

  const selectProduct = (product) => {
    setInputValue(product.productName || "");
    setOpen(false);
    setHighlightedIndex(-1);
    onSelectProduct?.(product);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const chosen = options[highlightedIndex] ?? options[0];
      if (chosen) selectProduct(chosen);
    }
  };

  const remaining = pagination.totalEntries - options.length;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-8"
          placeholder="Search and select products..."
          value={inputValue}
          disabled={disabled}
          onFocus={() => {
            setOpen(true);
            if (options.length === 0) search("", 1);
          }}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
          ) : (
            <>
              {options.map((product, i) => (
                <button
                  key={product.id}
                  type="button"
                  className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-muted ${
                    i === highlightedIndex ? "bg-muted" : ""
                  }`}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => selectProduct(product)}
                >
                  {product.productName}
                  {product.brand?.name ? ` - ${product.brand.name}` : ""}
                </button>
              ))}
              {pagination.currentPage < pagination.totalPages &&
                (loadingMore ? (
                  <div className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
                    Loading more products...
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full border-t border-border px-3 py-2 text-center text-xs font-medium text-primary hover:bg-muted"
                    onClick={loadMore}
                  >
                    Load More ({remaining} remaining)
                  </button>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
