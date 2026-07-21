# Theme system

Simple admin-panel theming: off-white/gray base + a fixed structural accent
(`#0a1830` — sidebar, header, login page, same in both modes) + a switchable
brand-color theme (2 presets for now, used for text/buttons only) +
independent light/dark mode. Picked from a settings drawer (gear FAB, fixed
right edge, vertically centered). Both picks persist across reloads via
`localStorage`. No page reload needed — everything reskins live via CSS
custom properties, exposed to Tailwind as utility classes (`bg-primary`,
`text-on-primary`, `bg-accent`, etc).

Tailwind v4 only. No SCSS modules, no CSS-in-JS.

## Files

| File | Role |
|---|---|
| `src/app/globals.css` | CSS vars: neutral admin base (light/dark) + per-theme brand colors, mapped into `@theme inline` so Tailwind generates utility classes from them |
| `src/context/theme-context.js` | `ThemeProvider`, `useTheme()` hook, `THEMES` list (source of truth), no-flash boot script |
| `src/app/layout.js` | Mounts `ThemeProvider`, injects no-flash script in `<head>`, renders `SettingsPanel` |
| `src/components/settings/SettingsPanel.jsx` | Gear FAB + slide-in drawer (theme swatches + mode toggle), styled with Tailwind classes only |

## How it works

1. `globals.css` defines neutral tokens on `:root` (light) and overrides
   under `[data-mode="dark"]`, plus brand tokens (`--color-primary`, etc.)
   under `[data-theme="navy"]` / `[data-theme="purple"]`.
2. `@theme inline { --color-primary: var(--color-primary); ... }` re-declares
   each CSS var as a Tailwind theme color, so `bg-primary`, `text-on-primary`,
   `border-border`, `bg-surface-alt`, etc. become real utility classes that
   resolve to whatever the current `data-theme`/`data-mode` attributes say.
3. `ThemeProvider` (client component, wraps the app in `layout.js`) holds
   `theme`/`mode` state, writes both to `<html data-theme="..." data-mode="...">`
   and to `localStorage` on change. Flipping the attribute is the entire
   "switch theme" operation — pure CSS cascade, no re-render needed.
4. A small inline `<script>` (`noFlashThemeScript` from `theme-context.js`,
   injected in `layout.js`'s `<head>`) sets both attributes from
   `localStorage` **before first paint**, so there's no flash of default
   theme before React hydrates.

## Adding a new theme

Two edits, both required:

1. **`src/context/theme-context.js`** — add one entry to the `THEMES` array:
   ```js
   { id: "my_theme", label: "My Theme", primary: "#RRGGBB", secondary: "#RRGGBB" }
   ```
   This alone makes it show up in the drawer swatch grid.

2. **`src/app/globals.css`** — add a matching block:
   ```css
   [data-theme="my_theme"] {
     --color-primary: #RRGGBB;
     --color-primary-hover: #RRGGBB;   /* primary lightened ~12% */
     --color-primary-active: #RRGGBB;  /* primary darkened ~12% */
     --color-primary-soft: rgba(r, g, b, 0.16); /* primary at 16% alpha */
     --on-primary: #1a1a1a or #ffffff; /* whichever contrasts better on primary */
     --color-secondary: #RRGGBB;
     --color-secondary-hover: #RRGGBB; /* secondary lightened ~12% */
     --on-secondary: #1a1a1a or #ffffff;
   }
   ```

No other file needs to change — `useTheme()`, the drawer, and Tailwind
utilities all read from `THEMES` / CSS vars.

## CSS variable reference

### Neutral base (admin panel — shared by every theme, only flips with mode)

| Variable | Light | Dark | Use |
|---|---|---|---|
| `--surface` | `#f7f7f5` | `#16181c` | page background (off-white in light mode) |
| `--surface-alt` | `#eeeeec` | `#1f2227` | subtle accents/hover backgrounds |
| `--text` | `#1a1a1a` | `#e5e7eb` | body text |
| `--heading` | `#0d0d0d` | `#f5f5f5` | headings |
| `--component-bg` | `#ffffff` | `#1f2227` | cards/panels/drawers |
| `--border` | `#e5e7eb` | `#2b2e33` | dividers/borders |

### Fixed structural accent (not swapped by theme or mode)

| Variable | Value | Use |
|---|---|---|
| `--color-accent` | `#0a1830` | general-purpose accent, same everywhere |
| `--sidebar-bg` | `#0a1830` | sidebar / header / login page background |
| `--sidebar-text` | `#9aa7b8` | sidebar labels |
| `--sidebar-bg-hover` | `#142544` | sidebar item hover |

These stay `#0a1830`-based regardless of `data-theme` or `data-mode` — the
navy/purple picker only affects `--color-primary`/`--color-secondary`
(text/buttons), not these structural surfaces.

### Per-theme brand colors (swapped by `[data-theme="x"]`)

| Variable | Meaning |
|---|---|
| `--color-primary` | brand accent — buttons, links, active states |
| `--color-primary-hover` | primary, ~12% lighter |
| `--color-primary-active` | primary, ~12% darker (pressed state) |
| `--color-primary-soft` | primary at 16% alpha (subtle backgrounds/highlights) |
| `--on-primary` | text/icon color on top of `--color-primary` |
| `--color-secondary` | secondary accent |
| `--color-secondary-hover` | secondary, ~12% lighter |
| `--on-secondary` | text/icon color on top of `--color-secondary` |

## The 2 presets

| id | label | primary | secondary |
|---|---|---|---|
| `navy` | Navy Blue (default) | `#3DA4E6` | `#001529` |
| `purple` | Purple | `#9283D4` | `#00B378` |

More will be added later, following the same pattern.

## Light / dark mode

Independent of color theme, toggled via `data-mode="dark"|"light"` on
`<html>`, persisted to `localStorage["pos-mode"]`, defaults to `light`
(admin panel — plain/white by default). Only the neutral base tokens
(surface/text/border/etc.) change with mode — the per-theme
`--color-primary`/`--color-secondary`/`--on-primary`/`--on-secondary` values
are unchanged across modes, since on-color contrast is measured against the
primary/secondary color itself, not the page backdrop.

`ThemeProvider` exposes `mode`/`setMode`/`modes` from `useTheme()` alongside
`theme`/`setTheme`/`themes`; the no-flash script sets both `data-theme` and
`data-mode` before first paint.

## Using theme vars in new components

Use the Tailwind utility classes generated from these vars — never hardcode
hex values in new UI, so it stays theme-reactive automatically:

```jsx
<div className="bg-component-bg border border-border text-text">
  <button className="bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active">
    Save
  </button>
</div>
```

Available utility classes: `bg-surface`, `bg-surface-alt`, `text-text`,
`text-heading`, `bg-accent`, `bg-sidebar-bg`, `text-sidebar-text`,
`hover:bg-sidebar-bg-hover`, `bg-component-bg`, `border-border`, `bg-primary`,
`hover:bg-primary-hover`, `active:bg-primary-active`, `bg-primary-soft`,
`text-on-primary`, `bg-secondary`, `hover:bg-secondary-hover`,
`text-on-secondary`.

## Known limitations

- **No SSR-known theme/mode.** The server always renders the `navy` theme's
  vars in light mode; the real values are applied client-side by the
  no-flash script before paint. Normal and fine for a `localStorage`-backed
  preference — there's just no per-user cookie/header read on the server.
