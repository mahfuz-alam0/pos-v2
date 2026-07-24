# UI Conventions (shadcn/ui + Tailwind)

Reference implementation for "how a page should look": `src/app/admin/inventory/manage-inventories/ManageInventoriesTable.tsx`. When building or fixing any admin page/table, match its patterns below instead of guessing.

## No visible borders on containers/toggles

Don't type `border` on wrapper divs, card containers, filter bars, or segmented toggles. This is not a shadcn/Tailwind default leaking in — every border you see was hand-written as a literal `border` class somewhere. Search for it before assuming it's structural:

```
grep -rn '"border\b\|className="[^"]*\bborder\b' <file>
```

- Page/table wrappers: no `border` + `bg-card` box. Use flat `p-6` page padding (see `ManageInventoriesTable.tsx` root div) and a soft `rounded-xl ring-1 ring-foreground/10` around the table only — never a hard `border`.
- Segmented toggles (e.g. Regular/Live, Manual/Scan): track is `rounded-lg bg-muted p-0.5` (no `border`), active segment `bg-primary text-primary-foreground`, inactive `text-muted-foreground hover:bg-background/60`, each segment `rounded-[7px]`.
- Table rows: no `border-b` per row. Use `border-b-0` + `shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]` for a soft 1px divider, plus zebra striping (`i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"`).
- `Input`, `SelectTrigger`, and outline `Button` DO have an intentional border baked into the shadcn component source (`border-input`) — that's correct and should stay; don't strip it globally.

## `Select` (`@base-ui/react/select`) — always pass `items`

If a `Select` root is given a non-empty default `value` (anything other than an empty/null placeholder state), its trigger will render the **raw value string** (e.g. `__all__`, `true`) instead of the matching label on first paint. Root cause: base-ui resolves the trigger label from `SelectItem`s registered inside the popup, which only mount once the dropdown has been opened at least once — so on first render there's nothing to resolve against and it falls back to stringifying the value.

Fix: always pass `items={[{ value, label }, ...]}` directly to the `Select` root alongside the `SelectContent`/`SelectItem` children — this is what makes the label resolve correctly immediately, with no "open it once" workaround needed.

```tsx
<Select
  items={[{ value: "__all__", label: "All Locations" }, ...locations.map(l => ({ value: l.id, label: l.name }))]}
  value={filters.location ?? "__all__"}
  onValueChange={...}
>
  ...
</Select>
```

Do this for every `Select` that has a default-selected (non-placeholder) value — including `__all__`-style "show everything" sentinels.

## Sticky table columns

Don't make multiple trailing columns sticky with hand-computed `right-[Npx]` offsets stacked against each other — any column whose real rendered width differs from the assumed budget (wrapped text, multi-line content, `min-w` instead of fixed `w`) desyncs every offset after it and columns visually overlap. This is very easy to reintroduce; don't redo it.

Follow `ManageInventoriesTable.tsx`: only the single trailing action-ish column is sticky (`sticky right-0 z-10 w-<fixed> bg-<zebra-matching> shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.15)]`). Everything else scrolls normally with the table.

## Table horizontal scroll container

The `Table` primitive (`src/components/ui/table.tsx`) already wraps `<table>` in its own `overflow-x-auto` div (`data-slot="table-container"`). Don't add a second independent `overflow-x-auto`/`overflow-auto` ancestor around it with a fixed height — nested scroll containers fight over which one owns the horizontal scrollbar, and it ends up rendering at the bottom of the *inner* (unconstrained-height) container instead of the visible viewport, so it's invisible until you scroll all the way down.

If you need a fixed-height scrollable table with a sticky header, use one wrapper that owns both axes and neutralize the primitive's inner container:

```tsx
<div
  className="overflow-auto *:data-[slot=table-container]:overflow-visible"
  style={{ maxHeight: "calc(100vh - 420px)" }}
>
  <Table>...</Table>
</div>
```

## Pagination

Don't hand-roll Previous/Next buttons. Use `TablePagination` from `src/components/ui/table-pagination.tsx` — it already renders numbered page buttons (with ellipsis for large ranges) plus a range label, and is the pattern used in `PackageReconciliationTab.tsx` / `AuditSessionsTab.tsx`. Needs `page`, `totalPages`, `totalEntries`, `pageSize`, `loading`, `onPageChange` — make sure the page's pagination state actually stores `totalPages` from the API response (`paginationData.totalPages`), it's easy to forget since some endpoints are only used for `currentPage`/`totalEntries`/`limit` elsewhere in the same file.

## Scrollbar theming (dark mode)

Already handled globally in `src/app/globals.css` (`scrollbar-color` + `::-webkit-scrollbar*` rules keyed off `var(--border)` / `var(--muted-foreground)`). Every scrollable element site-wide inherits it automatically — never add per-component/per-table scrollbar CSS, and never need to "fix" a white scrollbar in dark mode again by hand.
