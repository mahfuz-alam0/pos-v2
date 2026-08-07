# Desktop App Plan — Tauri + Vercel, One Codebase

**Constraints this plan is built around:**

1. The web app is **live on Vercel**. Nothing here may change or risk web behaviour.
2. The desktop app is built with **Tauri from this same codebase** — no fork, no second repo.

**Verdict:** Feasible. One real blocker (dynamic routes), one small blocker (2 API routes). Both are solved without touching how the web build behaves.

---

## 1. Audit results

Audited against Next.js **16.3.0** / React **19.2.8**, using `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`.

| Check | Result | Impact on static export |
|---|---|---|
| `middleware.ts` | None | ✅ No issue |
| Server actions (`'use server'`) | None | ✅ No issue |
| `next/headers`, `next/cookies` | None | ✅ No issue |
| `rewrites` / `redirects` / `headers` in config | None | ✅ No issue |
| ISR / `revalidate` | None | ✅ No issue |
| Env vars | All `NEXT_PUBLIC_*` (build-time inlined) except `PIXLAB_API_KEY` | ✅ No issue — see §3 |
| Data fetching | Client-side (Redux Toolkit + axios, 130 files use `localStorage`) | ✅ Already SPA-shaped |
| `next/image` | 6 files | ⚠️ Needs `unoptimized` — see §4 |
| API routes | 2 (`pixlab-medidscan`, `pixlab-docscan`) | ⚠️ Blocker — see §3 |
| Dynamic routes | 12 pages, **0** `generateStaticParams` | 🔴 **Main blocker** — see §2 |

Everything else already conforms. The app is effectively an SPA that happens to be served by Next.js.

---

## 2. Main blocker — dynamic routes

### The problem

Static export requires every dynamic path to be enumerable at build time. From the Next 16.3 docs, these are **unsupported**:

> - Dynamic Routes with `dynamicParams: true`
> - Dynamic Routes without `generateStaticParams()`

There are 12 dynamic pages, and none has `generateStaticParams`:

```
src/app/access-management/edit-employee-group/[id]/page.tsx
src/app/customer-management/groups/settings/[id]/page.tsx
src/app/inventory-management/audit/[id]/page.tsx
src/app/inventory-management/inventory-and-pricing/edit/[id]/page.tsx
src/app/inventory-management/packages/edit/[packageid]/page.tsx
src/app/inventory-management/reconciliation/sessions/[id]/edit/page.tsx
src/app/inventory-management/reconciliation/sessions/details/[id]/page.tsx
src/app/inventory-management/transfers/details/[id]/page.tsx
src/app/metrc/transfers/[id]/assign-package/page.tsx
src/app/metrc/transfers/[id]/page.tsx
src/app/pos/drawers/settings/[id]/page.tsx
src/app/settings/labels/edit/[labelId]/page.tsx
```

The IDs are runtime values from the backend (package IDs, transfer IDs, employee-group IDs). They cannot be pre-listed at build time — so `generateStaticParams` returning a real list is impossible here.

### Why this is still easy to fix

Every one of these pages is a thin server wrapper that does one thing: await the param, pass it as a prop to a client component. Example:

```tsx
// src/app/metrc/transfers/[id]/page.tsx — current
import MetrcTransferDetailPage from "./MetrcTransferDetailPage";

export const metadata = { title: "Metrc Transfer Details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MetrcTransferDetailPage id={id} />;
}
```

No server-side data fetching. The ID is only used to feed a client component that fetches on mount. All navigation into these routes is client-side (`router.push` / `<Link>`) — verified across the codebase. So the ID does not need to come from the server at all.

### The fix — read the ID on the client

Add `generateStaticParams` returning an empty array (satisfies the export requirement, emits a shell route), and read the ID client-side via `useParams()` instead of the server `params` prop.

```tsx
// src/app/metrc/transfers/[id]/page.tsx — after
import MetrcTransferDetailPage from "./MetrcTransferDetailPage";

export const metadata = { title: "Metrc Transfer Details" };

// Desktop/static export: paths are not knowable at build time.
// IDs are resolved on the client from the URL.
export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function Page() {
  return <MetrcTransferDetailPage />;
}
```

```tsx
// MetrcTransferDetailPage.tsx — add at top of the client component
"use client";
import { useParams } from "next/navigation";

export default function MetrcTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  // ...unchanged
}
```

**Important:** with `generateStaticParams` returning `[]` and `dynamicParams = false`, no HTML file is emitted for these routes. Deep-linking to `/metrc/transfers/123` by typing the URL will 404. Two things make this acceptable:

- **Inside the desktop app** the user always arrives via in-app navigation (`router.push`), which is client-side routing — the route resolves fine. Users cannot type URLs; there is no address bar.
- **On the web** nothing changes, because this branch never runs — see §5.

If deep-linking must work in the desktop shell, the alternative is a catch-all SPA fallback (`trailingSlash: true` + Tauri serving `404.html` as the fallback document). Not needed for v1.

**Effort:** 12 pages × ~10 min each, mechanical. **~0.5 day including testing.**

---

## 3. Second blocker — the 2 API routes

```
src/app/api/pixlab-medidscan/route.ts
src/app/api/pixlab-docscan/route.ts
```

Both are pure CORS proxies to PixLab — they take `{ img, pixlabApiKey }`, forward it, and normalise the response. No DB, no session, no cookies. They exist to avoid browser CORS restrictions and to keep `PIXLAB_API_KEY` off the client.

Static export drops non-`GET` route handlers (docs: *"Only the `GET` HTTP verb is supported"*), and both are `POST`. So in the desktop build these routes will not exist.

**Fix — point the desktop build at the already-deployed Vercel routes.** Do not duplicate the proxy logic into Tauri. The desktop app has internet access regardless (it talks to the POS backend), so it can call the live Vercel deployment for these two endpoints.

Introduce a base-URL helper:

```ts
// src/lib/apiBase.ts
// Web build: relative path, served by the same Vercel deployment.
// Desktop build: absolute URL to the live Vercel deployment, since the
// static export contains no API routes.
export const INTERNAL_API_BASE = process.env.NEXT_PUBLIC_INTERNAL_API_BASE ?? "";
```

Then change the two call sites from `fetch("/api/pixlab-docscan")` to:

```ts
fetch(`${INTERNAL_API_BASE}/api/pixlab-docscan`)
```

- Web (`.env` on Vercel): `NEXT_PUBLIC_INTERNAL_API_BASE` unset → resolves to `""` → relative path → **identical behaviour to today**.
- Desktop (`.env.desktop`): `NEXT_PUBLIC_INTERNAL_API_BASE=https://<your-app>.vercel.app`.

`PIXLAB_API_KEY` stays server-side on Vercel and is never shipped in the desktop bundle. This is the security-correct option — do **not** move the key into the client bundle to avoid the round trip, as a Tauri bundle is trivially unpackable and the key would be extractable.

**One thing to confirm before shipping:** the Vercel routes must accept requests from the Tauri origin. Tauri webviews send `Origin: tauri://localhost` (or `https://tauri.localhost` on Windows). Add an explicit CORS allowlist to those two route handlers for the Tauri origin, and keep it to those two routes only.

**Effort:** ~0.5 day including the CORS check.

---

## 4. `next/image`

6 files use `next/image`. The default loader requires the Vercel image-optimization server, unsupported in static export.

Fix: `images: { unoptimized: true }` in the desktop branch only. Images render as plain `<img>`. Fine — these are logos and integration icons (`IntegrationsList`, `LeaflySettings`, `AeropaySettings`, `WeedmapsSettings`, `SignInForm`, `Sidebar`), not large photography. The web build keeps full optimization.

No code changes needed, config only.

---

## 5. Keeping the web build untouched

This is the constraint that matters most, so the mechanism is worth being explicit about.

```js
// next.config.js
/** @type {import('next').NextConfig} */
const isDesktop = process.env.BUILD_TARGET === "desktop";

const nextConfig = {
  reactCompiler: true,

  // Desktop-only. Vercel never sets BUILD_TARGET, so this branch is dead code there
  // and `next build` / `next dev` behave exactly as they do today.
  ...(isDesktop && {
    output: "export",
    images: { unoptimized: true },
    distDir: ".next-desktop",
  }),
};

export default nextConfig;
```

```jsonc
// package.json
"scripts": {
  "dev": "next dev",                                  // unchanged
  "build": "next build",                              // unchanged — Vercel uses this
  "start": "next start",                              // unchanged
  "build:desktop": "BUILD_TARGET=desktop next build", // new
  "tauri": "tauri"                                    // new
}
```

Why the web build is provably safe:

- **Vercel never sets `BUILD_TARGET`**, so `isDesktop` is `false` and the config object is byte-identical to today's.
- **`distDir: ".next-desktop"`** keeps the desktop build from clobbering the `.next` directory, so the two builds never race or poison each other's cache.
- **`generateStaticParams` returning `[]` is inert on the web build.** With `output` unset, Next treats the route as server-rendered on demand; an empty static-params list simply means nothing is prerendered ahead of time — the exact behaviour these pages have today.
- **`useParams()` works identically on both targets.** It is a normal client hook, unrelated to export mode.
- **`INTERNAL_API_BASE` is `""` on the web**, producing the same relative fetch as today.

Net effect on the live site: **no behavioural change**. The §2 and §3 refactors are neutral on web and enabling on desktop.

**Verification gate before any of this merges:**

```bash
npm run build        # must succeed, output identical in shape to today
npm run typecheck
npm run lint
```
Then deploy to a Vercel **preview** branch and click through the 12 dynamic routes on the preview URL before merging to the branch Vercel serves from. Do not merge to `master` on a green local build alone.

---

## 6. Tauri shell

Chosen over Electron: ~10–15 MB installer vs ~150 MB, materially lower RAM. POS terminals often run modest hardware, so this is not just a nicety.

```bash
npm install -D @tauri-apps/cli
npx tauri init
```

`src-tauri/tauri.conf.json` — the parts that matter:

```jsonc
{
  "build": {
    "beforeBuildCommand": "npm run build:desktop",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [{ "title": "POS", "width": 1440, "height": 900, "resizable": true }]
  }
}
```

Notes:

- `output: "export"` writes to `out/` regardless of `distDir` (which only affects the intermediate build directory), so `frontendDist: "../out"` is correct.
- Requires the Rust toolchain on the build machine (`rustup`). One-time setup.
- Add `out/`, `.next-desktop/`, and `src-tauri/target/` to `.gitignore`.
- Set `NEXT_PUBLIC_INTERNAL_API_BASE` in the desktop build environment (§3).

Build: `npx tauri build` → produces `.msi`/`.exe` (Windows), `.dmg` (macOS).

---

## 7. Desktop concerns

| Concern | Status |
|---|---|
| `localStorage` (130 files) | Works unchanged — Tauri's webview is a normal browser context with persistent storage. |
| Printing (labels, receipts, reports) | Existing `window.print()` flows work in the webview. |
| Auth / tokens | Client-side already, no change. |
| Deep-linking | Not applicable — no address bar, all navigation in-app (§2). |
| Offline | Behaves as the web app does today: backend unreachable → error state. Offline queueing is **not** in scope. |
| Auto-update | Tauri has a built-in updater. Optional; needs a hosted manifest + signing keys. |
| Code signing | Optional for internal deployment; required to avoid Windows SmartScreen warnings on public distribution. |

**Explicitly out of scope for v1:** direct thermal-printer, cash-drawer, and barcode-scanner access via native APIs. The current browser-based print flow already works. If the client wants driver-level hardware control (printing with no dialog, opening the drawer), that is a separate Tauri Rust plugin effort — **add 3–5 days** and scope it separately.

---

## 8. Plan of work

| # | Task | Est. | Risk |
|---|---|---|---|
| 1 | Conditional `next.config.js` + `build:desktop` script | 0.5d | Low |
| 2 | Refactor 12 dynamic pages to `useParams()` + `generateStaticParams` | 0.5d | Low — mechanical |
| 3 | `INTERNAL_API_BASE` helper + 2 call sites + Tauri CORS allowlist | 0.5d | Low |
| 4 | First successful `build:desktop`, fix fallout | 1d | **Medium** — first export always surfaces surprises |
| 5 | Tauri scaffold, config, icons, build pipeline | 1–2d | Low |
| 6 | **Web regression pass** — full `next build`, Vercel preview, click through all routes | 1d | **Highest business risk — do not compress** |
| 7 | Desktop QA on target OS (Windows), installer, packaging | 1–2d | Medium |

**Total: 6–8 working days** for a shippable first desktop build, web untouched.

Add **3–5 days** only if native hardware integration is requested.

### Sequencing

Steps 1–3 are neutral on web and can merge independently, each behind its own review. Step 6 is a gate, not a formality: the live site is the business, and the desktop build is additive. If step 6 finds anything, it blocks — the desktop timeline slips, the web deploy does not.

---

## 9. What does not change

- Vercel deployment, `next build`, `next dev`, `next start` — untouched.
- All 509 files under `src/app` — untouched except the 12 dynamic `page.tsx` wrappers and 2 fetch call sites.
- Components, Redux store, styling, business logic — untouched.
- One repo, one component tree. Desktop is a **build target plus a thin shell**, not a fork.
