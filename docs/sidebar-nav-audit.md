# Sidebar Navigation Audit (`app/core/Sidebar/SidebarContent.js`)

Source of role logic: `util/permission.js` → `usePermission()` exposes:
- `checkPermission(code)` — leaf-level check
- `checkParentPermission(parentCode)` — section-level check (true if parent itself OR any `parentCode.X` child perm present)
- `hasRole(role)` — `SUPER_ADMIN` / `ADMINISTRATION` / `BOTH`

Role bypass: `user.type === "SUPER_ADMIN"` or `"ADMINISTRATION"` → `checkPermission`/`checkParentPermission` always `true`. `"ACCESS_CONTROLLED"` → checked against `user.allowedPermissionCodes[]`.

---

## How `usePermission()` is built

File: `util/permission.js`. Depends on `useAuth()` from `util/use-auth.js`.

**`useAuth()` origin** (`util/use-auth.js`):
- React Context (`authContext`), provided app-wide via `<ProvideAuth>` wrapping app in `_app.js`.
- Internally `useProvideAuth()` holds `user` in `useState(null)`.
- On login (`loginWithBackend`) — POST to `${NEXT_PUBLIC_BASE_URL}/v1/organization-accounts/multi-method-login` (cookie session, `withCredentials`) → response `data.userInfo` → `setUser(userData)` + persisted to `localStorage.setItem("user", ...)`.
- On mount (`useEffect`) — rehydrates `user` from `localStorage.getItem("user")` if present (so refreshes don't lose auth state client-side; real session is the cookie).
- `useAuth()` just returns `useContext(authContext)`, exposing `{ user, login, signup, signOut, isLoadingUser, ... }`.
- Shape of `user` relevant to permissions: `user.type` (`"SUPER_ADMIN" | "ADMINISTRATION" | "ACCESS_CONTROLLED"`) and `user.allowedPermissionCodes` (array of granted leaf codes, only populated/relevant for `ACCESS_CONTROLLED`).

**`usePermission()` itself** (`util/permission.js`):
```js
export const usePermission = () => {
  const { user } = useAuth();
  const permissions = user?.allowedPermissionCodes || [];

  const hasRole = (requiredRole) => { ... }        // role-string equality checks
  const checkPermission = (code) => { ... }         // leaf check
  const checkParentPermission = (parentCode) => { ... } // section check

  return { checkPermission, checkParentPermission, hasRole };
};
```
- Pure derivation hook — no own state, no API calls. Re-renders whenever `user` from context changes (login/logout/refresh).
- `hasRole(role)`: `SUPER_ADMIN`/`ADMINISTRATION` → exact `user.type` match; `BOTH` → `["SUPER_ADMIN","ADMINISTRATION"].includes(user.type)`.
- `checkPermission(code)`:
  1. If `code` is itself one of the three role strings, delegate to `hasRole(code)`.
  2. Else: `SUPER_ADMIN`/`ADMINISTRATION` → always `true` (unrestricted). `ACCESS_CONTROLLED` → `permissions.includes(code)`. Anything else (no user / unknown type) → `false`.
- `checkParentPermission(parentCode)`: same role short-circuit, but for `ACCESS_CONTROLLED` also treats parent as granted if **any** child permission starts with `"${parentCode}."` — this is what lets a SubMenu render when the user has at least one leaf permission under it, without needing an explicit parent-level grant.

So: this hook has no separate backend/config — it's 100% derived client-side from the `user` object already sitting in auth context/localStorage after login. Permission *codes* themselves (`"SALES_AND_RETURNS.SALES"`, `"ANALYTICS.COMMAND_CENTER"`, etc.) are opaque strings defined server-side and just passed straight through in `user.allowedPermissionCodes`; nothing in this file validates or enumerates them.

---

## Menu: `currentMenu === "retail"` (main POS sidebar)

| Nav Item | Key | Route | Guard |
|---|---|---|---|
| Dashboard | `admin/dashboard` | `/admin/dashboard` | none |
| **Fulfillment** (SubMenu) | `fulfillment` | — | none (always shown) |
| — POS | `pos` | `/pos` \| `/sales` (mode-based) | `checkPermission("SALES_AND_RETURNS.SALES")` |
| — POS (Tablet Mode) | `pos/tablet` | `/pos/tablet` | `checkPermission("SALES_AND_RETURNS.SALES")` |
| — Order Ahead | `/admin/orderahead` | `/admin/orderahead` | `checkPermission("SALES_AND_RETURNS.SALES")` |
| — Front Desk | `/admin/front-desk` | `/admin/front-desk` | none |
| — Sales | `/admin/orders` | `/admin/orders` | none |
| — Returns | `/pos/returns` | `/pos/returns` | `checkPermission("SALES_AND_RETURNS.SALE_RETURNS")` |
| **Customer Mgmt** (SubMenu) | `customers` | — | `checkParentPermission("CUSTOMER_MANAGEMENT")` |
| — Customers | — | `/admin/customer-management/customers` | `checkPermission("CUSTOMER_MANAGEMENT.CUSTOMERS")` |
| — Customer Groups | — | `/admin/customers/groups` | `checkPermission("CUSTOMER_MANAGEMENT.CUSTOMER_GROUPS")` |
| — Rewards & Types | — | `/admin/customer-management/customer-types-rewards` | `checkPermission("CUSTOMER_MANAGEMENT.CUSTOMER_TYPES")` |
| **Promotions** (SubMenu) | `promotions` | — | `checkParentPermission("PROMOTIONS")` |
| — Coupons | — | `/admin/coupons` | `checkPermission("PROMOTIONS.COUPONS")` |
| — Deals | — | `/admin/deals` | `checkPermission("PROMOTIONS.DEALS")` |
| — Loyalty Reward Settings | — | `/admin/loyalty/reward-settings` | `checkPermission("SUPER_ADMIN")` |
| **Inventory Mgmt** (SubMenu) | `inventory-management` | — | none (always shown) |
| — Inventory & Pricing | — | `/admin/inventory/manage-inventories` | `checkPermission("INVENTORY_MANAGEMENT.INVENTORIES")` |
| — Adjustments | — | `/admin/inventory/reconciliation` | `checkPermission("INVENTORY_MANAGEMENT.INVENTORIES")` |
| — Inventory Levels | — | `/admin/audit/insights/inventory-on-hand` | none |
| — Unit of Measurements | — | `/admin/inventory/uom` | `checkPermission("INVENTORY_MANAGEMENT.INVENTORIES")` |
| — Audit | — | `/admin/inventory/audit` | none |
| — Transfers | — | `/admin/inventory/transfers` | none |
| — Purchase Orders | — | `/admin/inventory/purchase-orders` | none |
| — Packages | — | `/admin/inventory/packages` | none |
| — Storage Locations | — | `/admin/inventory/storage-locations` | `checkPermission("INVENTORY_MANAGEMENT.INVENTORIES")` |
| **Catalog** (SubMenu) | `catalog` | — | `checkParentPermission("CATALOG")` |
| — Products | — | `/admin/catalog/products` | none |
| — Classifications | — | `/admin/catalog/classifications` | none |
| — Brands | — | `/admin/catalog/manufacturers` | none |
| — Product Matrix | — | `/admin/catalog/products/matrix` | none |
| — Tags | — | `/admin/settings/tags` | none |
| — Strains | — | `/admin/settings/strains` | none |
| — Suppliers | — | `/admin/settings/suppliers` | none |
| **Online Ordering** (SubMenu) | `Online Ordering` | — | `checkParentPermission("BOTH")` (i.e. role SUPER_ADMIN/ADMINISTRATION) |
| — Ecom Entities | — | `/admin/ecomm/entities` | none |
| — Notifications | — | `/bleaum/notification/my-notification` | none |
| — Calendar | — | `/extensions/calendar` | none |
| — Loyalty | — | `/bleaum/configurations/loyalty` | none |
| — Banners | — | `/bleaum/configurations/banners` | none |
| — Chat Config | — | `/bleaum/configurations/chat` | none |
| — General | — | `/bleaum/configurations/general` | none |
| — Spotlight | — | `/bleaum/configurations/sections` | none |
| — Firebase | — | `/bleaum/configurations/firebase` | none |
| — Media Links | — | `/bleaum/configurations/media-links` | none |
| — Cover Page | — | `/bleaum/configurations/cover-page` | none |
| **METRC** (SubMenu) | `metrc` | — | `userDetails?.orgFeatureScopes?.includes("METRC_REPORTING")` (feature flag, not role) |
| — Metrc Reconciliations | — | `/admin/inventory/metrc-reconciliation/packages` | `checkPermission("INVENTORY_MANAGEMENT.METRC_RECONCILIATION")` |
| — Metrc Transfers | — | `/admin/inventory/transfers/metrc-transfer` | `checkPermission("TRANSFERS.METRC")` |
| — Metrc Configuration | — | `/admin/settings/metrc-configuration` | `checkPermission("BOTH")` |
| **Audit Logs** (SubMenu) | `audit-log` | — | none (always shown) |
| — Transactions | — | `/admin/audit/transactions` | `checkPermission("CASH_MANAGEMENT.RD")` |
| — ACH Transactions | — | `/admin/audit/ach-transactions` | none |
| **Reports & Analytics** (SubMenu) | `reports-analytics` | — | `checkParentPermission("ANALYTICS")` OR `checkParentPermission("REPORTING")` |
| — **Analytics** (nested SubMenu) | `analytics` | — | `checkParentPermission("ANALYTICS")` |
| —— Command Center | — | `/admin/sales-report/executive-summary` | `checkPermission("ANALYTICS.COMMAND_CENTER")` |
| —— Performance Metrics | — | `/admin/sales-report/performance` | `checkPermission("ANALYTICS.PERFORMANCE_METRICS")` |
| —— Sales Intelligence | — | `/admin/sales-report/sales-intelligence` | `checkPermission("ANALYTICS.SALES_INTELLIGENCE")` |
| —— Promo Performance | — | `/admin/sales-report/discounts` | `checkPermission("ANALYTICS.PROMO_PERFORMANCE")` |
| —— Sales Heatmap | — | `/admin/audit/day-and-time` | `checkPermission("ANALYTICS.SALES_HEATMAP")` |
| —— Supply Tracker | — | `/admin/audit/inventory-reorder` | `checkPermission("ANALYTICS.SUPPLY_TRACKER")` |
| —— Referral Source | — | `/admin/sales-report/referral-source-report` | `checkPermission("ANALYTICS.REFERRAL_SOURCE")` |
| — **Reporting** (nested SubMenu) | `reporting` | — | `checkParentPermission("REPORTING")` |
| —— Customer | — | `/admin/sales-report/customer-report` | `checkPermission("REPORTING.CUSTOMER")` |
| —— Inventory | — | `/admin/sales-report/inventory` | `checkPermission("REPORTING.INVENTORY")` |
| —— Loyalty | — | `/admin/sales-report/loyalty` | `checkPermission("REPORTING.LOYALTY")` |
| —— Sales | — | `/admin/sales-report/sales` | `checkPermission("REPORTING.SALES")` |
| —— Taxes | — | `/admin/sales-report/taxes` | `checkPermission("REPORTING.TAXES")` |
| **Cash Mgmt** (SubMenu) | `cash-management` | — | `checkParentPermission("CASH_MANAGEMENT")` |
| — Main Vault | — | `/admin/audit/cash-management` | `checkPermission("CASH_MANAGEMENT.VAULT")` |
| — Registers | — | `/admin/inventory/registers` | `checkPermission("CASH_MANAGEMENT.RD")` |
| — Drawers | — | `/pos/drawers` | `checkPermission("CASH_MANAGEMENT.RD")` |
| **Access Mgmt** (SubMenu) | `Access Management` | — | none (always shown) |
| — Team | — | `/admin/access-management/employee` | `checkPermission("BOTH")`; also `disabled={user?.type === "ACCESS_CONTROLLED"}` |
| — Roles | — | `/admin/access-management/role` | `checkPermission("BOTH")`; also `disabled={user?.type === "ACCESS_CONTROLLED"}` |
| — Shifts | — | `/admin/access-management/employee-shift` | none |
| **Delivery Mgmt** (SubMenu) | `Delivery Management` | — | none (always shown) |
| — Delivery | — | `/admin/delivery-management/delivery-profiles` | none |
| — Drivers | — | `/admin/delivery-management/persons` | none |
| — Vehicles | — | `/admin/delivery-management/vehicle` | none |
| — Delivery Jobs | — | `/admin/delivery-management/jobs` | none |
| **Settings** (SubMenu) | `Settings` | — | none (always shown) |
| — Shop Preferences | — | `/admin/settings/cashier` | `checkPermission("BOTH")` |
| — Integrations | — | `/admin/settings/integrations` | `checkPermission("BOTH")` |
| — Tasks | — | `/admin/tasks/tasks-listings` | none |
| — Pricing Templates | — | `/admin/settings/pricing-templates` | `checkPermission("BOTH")` |
| — Vendors | — | `/admin/settings/vendors` | `labMode` (redux flag, not role) |
| — Tax | — | `/admin/settings/tax` | `checkPermission("INVENTORY_MANAGEMENT.TAXES")` |
| — Hardware Clients | — | `/admin/hardware-clients` | `checkPermission("BOTH")` |
| — Print | — | (label section, no direct link shown in snippet) | `checkPermission("BOTH")` |
| — Print Settings | — | `/admin/print` | `checkPermission("BOTH")` |
| — Store Information | — | `/admin/settings/stores-information` | `checkPermission("BOTH")` |
| — Reset Password | — | `/admin/change-password` | none |

---

## Other `currentMenu` variants (separate business lines, no permission checks used at all — only `currentMenu` redux switch)

- `deliveryy` → Dashboard, Deliveries, Delivery People, Delivery Plans
- `cultivation` → Dashboard, Orders, Growers, Inventory (+ Adjustments/Transfers/Packages/etc.), Vendors, Cultivation (Plants/Batches/Harvests/Waste)
- `wholesale` → same shape as cultivation + Manufacturing (Recipes)
- `ecommerce` → Dashboard, Catalog, Customers, Orders, Promotions, Loyalty, Notifications
- `shipment` → Dashboard, My Shipping
- `finance` → Dashboard, Reports, Accounting, (group) Transactions/Spending/Vendors/Revenue/People

None of these four use `checkPermission`/`checkParentPermission` — worth deciding if that's intentional gap or to-do.

---

## For your new nav: reusable guard functions

```js
import { usePermission } from "../../../util/permission";
const { checkPermission, checkParentPermission, hasRole } = usePermission();

// leaf item:
checkPermission("SOME_PARENT.SOME_CODE")   // or "SUPER_ADMIN" / "ADMINISTRATION" / "BOTH"

// section/parent item (show section if any child perm granted):
checkParentPermission("SOME_PARENT")

// role-only gate:
hasRole("SUPER_ADMIN")
```

Also seen in file, non-permission gates worth knowing about:
- `userDetails?.orgFeatureScopes?.includes("FEATURE_CODE")` — org feature-scope gate (METRC block)
- `labMode` from `useSelector((state) => state?.labModeReducer?.labMode)` — lab/test flag gate
- `user?.type === "ACCESS_CONTROLLED"` — used to `disabled` (not hide) specific items
