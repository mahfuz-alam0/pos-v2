# Theme system

Global, dark-mode-only theme system. User picks a color theme from a
settings drawer (gear icon, fixed right edge); pick persists across
reloads via `localStorage`. No page reload needed to switch — everything
reskins live via CSS custom properties.

## Files

| File | Role |
|---|---|
| `src/styles/_themes.css` | All CSS variables: shared dark-mode base + 10 per-theme `[data-theme="x"]` blocks |
| `src/context/theme-context.js` | `ThemeProvider`, `useTheme()` hook, `THEMES` list (source of truth), no-flash boot script |
| `src/app/layout.js` | Mounts `ThemeProvider`, injects no-flash script in `<head>`, renders `SettingsPanel` |
| `src/components/settings/SettingsPanel.jsx` | Gear FAB + drawer UI (swatch grid) |
| `src/components/settings/SettingsPanel.module.scss` | Styles for the FAB/drawer |

## How it works

1. `_themes.css` defines CSS vars on `:root` (defaults = `style` theme) and
   again per theme under `[data-theme="<id>"]` selectors.
2. `ThemeProvider` (client component, wraps whole app in `layout.js`) holds
   `theme` state, writes it to `<html data-theme="...">` and to
   `localStorage["pos-theme"]` on change.
3. Because the CSS selector is `[data-theme="x"] { --color-primary: ... }`,
   flipping the attribute on `<html>` is the entire "switch theme" operation
   — no re-render of styled components needed, just cascading CSS.
4. A small inline `<script>` (string built in `theme-context.js` as
   `noFlashThemeScript`, injected in `layout.js`'s `<head>`) sets
   `data-theme` from `localStorage` **before first paint**. Without this,
   the page would flash the default theme for a frame before React
   hydrates and corrects it.

## Adding a new theme

Two edits, both required:

1. **`src/context/theme-context.js`** — add one entry to the `THEMES` array:
   ```js
   { id: "my_theme", label: "My Theme", primary: "#RRGGBB", secondary: "#RRGGBB" }
   ```
   This alone makes it show up in the drawer swatch grid (swatches are
   generated from this array).

2. **`src/styles/_themes.css`** — add a matching block:
   ```scss
   [data-theme="my_theme"] {
     --color-primary: #RRGGBB;
     --color-primary-hover: #RRGGBB;   // primary lightened ~12%
     --color-primary-active: #RRGGBB; // primary darkened ~12%
     --color-primary-soft: rgba(r, g, b, 0.16); // primary at 16% alpha
     --on-primary: #1a1a1a or #ffffff; // whichever gives better contrast on primary
     --color-secondary: #RRGGBB;
     --color-secondary-hover: #RRGGBB; // secondary lightened ~12%
     --on-secondary: #1a1a1a or #ffffff;
   }
   ```
   Don't eyeball the derived shades — regenerate them so hover/active/on-color
   stay contrast-correct. The generator script used for the original 10
   themes (lighten/darken by RGB mix toward white/black + WCAG contrast
   check for on-color) is reproducible from this snippet:
   ```js
   function hexToRgb(hex) { hex = hex.replace('#',''); return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)]; }
   function rgbToHex([r,g,b]) { return '#' + [r,g,b].map(v => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join(''); }
   function lighten(hex, pct) { const [r,g,b] = hexToRgb(hex); return rgbToHex([r+(255-r)*pct, g+(255-g)*pct, b+(255-b)*pct]); }
   function darken(hex, pct) { const [r,g,b] = hexToRgb(hex); return rgbToHex([r*(1-pct), g*(1-pct), b*(1-pct)]); }
   // on-color: pick #fff or #1a1a1a, whichever has higher WCAG contrast against hex
   ```
   Pick 12% for hover/active and 16% alpha for the soft variant to match
   the existing 10 themes (consistency across swatches).

No other file needs to change. `useTheme()`, the drawer, and the FAB all
read from `THEMES` / CSS vars — nothing is hardcoded per-theme outside
these two files.

## CSS variable reference

### Dark-mode base (shared by every theme — do not vary per-theme)

| Variable | Value | Use |
|---|---|---|
| `--surface` | `#38424b` | main dark bg |
| `--surface-alt` | `#525f6b` | accents (lighten(surface, 10%)) |
| `--text` | `#e0e0e0` | body text |
| `--heading` | `#ececec` | headings (lighten(text, 5%)) |
| `--sidebar-bg` | `#333c44` | sidebar (darken(surface, 2%)) |
| `--component-bg` | `#434f5a` | cards/panels |
| `--sidebar-text` | `#a1a1a1` | sidebar labels |
| `--sidebar-bg-hover` | `#404b54` | sidebar hover (lighten(sidebar-bg, 6%)) |
| `--border` | `#495762` | dividers/borders |
| `--framed-bg` | `#242a2f` | outer bg in framed/boxed layout (darken(surface, 10%)) |

### Per-theme (swapped by `[data-theme="x"]`)

| Variable | Meaning |
|---|---|
| `--color-primary` | brand accent — buttons, links, active states |
| `--color-primary-hover` | primary, ~12% lighter |
| `--color-primary-active` | primary, ~12% darker (pressed state) |
| `--color-primary-soft` | primary at 16% alpha (subtle backgrounds/highlights) |
| `--on-primary` | text/icon color to place on top of `--color-primary` (`#1a1a1a` or `#ffffff`, whichever contrasts) |
| `--color-secondary` | secondary accent |
| `--color-secondary-hover` | secondary, ~12% lighter |
| `--on-secondary` | text/icon color to place on top of `--color-secondary` |

## The 10 presets

| id | label | primary | secondary |
|---|---|---|---|
| `style` | Navy Blue (default) | `#038FDE` | `#001529` |
| `light_purple` | Purple | `#8A2BE2` | `#00B378` |
| `red` | Red | `#FF2B7A` | `#00D9C9` |
| `blue` | Blue | `#3DA4E6` | `#FCB53B` |
| `dark_blue` | Dark Blue | `#0469B9` | `#17BDE5` |
| `orange` | Orange | `#F18805` | `#F1D065` |
| `light_blue` | Light Blue | `#6A95FF` | `#59DCFF` |
| `deep_orange` | Deep Orange | `#F87060` | `#70A288` |
| `light_purple_1` | Violet Pink | `#A172E7` | `#E14594` |
| `light_purple_2` | Lavender Teal | `#956FE7` | `#64D7D6` |

## Using theme vars in new components

Prefer CSS vars directly (via SCSS module or inline `style`) over hardcoding
hex values, so any new UI stays theme-reactive automatically:

```scss
.card {
  background: var(--component-bg);
  border: 1px solid var(--border);
  color: var(--text);
}

.primaryButton {
  background: var(--color-primary);
  color: var(--on-primary);

  &:hover { background: var(--color-primary-hover); }
  &:active { background: var(--color-primary-active); }
}
```

Tailwind utility classes won't pick these up automatically (they're plain
CSS vars, not registered in `@theme`) — use arbitrary-value syntax if you
need Tailwind: `bg-[var(--color-primary)]`.

## Known limitations

- **Dark mode only.** No light-mode variant exists. If light mode is ever
  needed, the base tokens table above (surface/text/border/etc.) would need
  a `[data-mode="light"]` (or `prefers-color-scheme`) counterpart — the
  per-theme primary/secondary blocks would need light-safe on-color/hover
  recomputation too, since the current derived shades assume a dark
  backdrop.
- **No SSR-known theme.** The server always renders the `style` (default)
  theme's vars via `:root`; the real theme is applied client-side by the
  no-flash script before paint. This is normal and fine for a
  `localStorage`-backed preference, but means the very first HTML byte
  from the server is always the default theme — there's no per-user theme
  cookie/header read on the server.
