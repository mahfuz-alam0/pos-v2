import {
  LayoutDashboard,
  ShoppingCart,
  UsersRound,
  Tag,
  Package,
  BookOpen,
  Globe,
  ShieldCheck,
  FileText,
  BarChart3,
  Wallet,
  UserCog,
  Truck,
  Settings,
} from "lucide-react";

// Retail menu tree — ported from old app's SidebarContent.js (currentMenu === "retail").
// Each item: { key, label, href } (leaf) or { key, label, icon, children } (section).
export const retailMenu = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    key: "fulfillment",
    label: "Fulfillment",
    icon: ShoppingCart,
    children: [
      { key: "pos-tablet", label: "POS", href: "/pos/tablet" },
      { key: "tablet-mode-pos", label: "Tablet Mode POS", href: "/pos/tablet-mode" },

      { key: "order-ahead", label: "Order Ahead", href: "/admin/orderahead" },
      { key: "front-desk", label: "Front Desk", href: "/admin/front-desk" },
      { key: "sales", label: "Sales", href: "/admin/orders" },
      { key: "returns", label: "Returns", href: "/pos/returns" },
    ],
  },
  {
    key: "customers",
    label: "Customer Mgmt",
    icon: UsersRound,
    children: [
      {
        key: "customers-list",
        label: "Customers",
        href: "/admin/customer-management/customers",
      },
      {
        key: "customer-groups",
        label: "Customer Groups",
        href: "/admin/customers/groups",
      },
      {
        key: "customer-rewards",
        label: "Rewards & Types",
        href: "/admin/customer-management/customer-types-rewards",
      },
    ],
  },
  {
    key: "promotions",
    label: "Promotions",
    icon: Tag,
    children: [
      { key: "coupons", label: "Coupons", href: "/admin/coupons" },
      { key: "deals", label: "Deals", href: "/admin/deals" },
      {
        key: "loyalty-reward-settings",
        label: "Loyalty Reward Settings",
        href: "/admin/loyalty/reward-settings",
      },
    ],
  },
  {
    key: "inventory-management",
    label: "Inventory Mgmt",
    icon: Package,
    children: [
      {
        key: "inventory-pricing",
        label: "Inventory & Pricing",
        href: "/admin/inventory/manage-inventories",
      },
      {
        key: "inventory-adjustments",
        label: "Adjustments",
        href: "/admin/inventory/reconciliation",
      },
      {
        key: "inventory-levels",
        label: "Inventory Levels",
        href: "/admin/audit/insights/inventory-on-hand",
      },
      {
        key: "uom",
        label: "Unit of Measurements",
        href: "/admin/inventory/uom",
      },
      { key: "audit", label: "Audit", href: "/admin/inventory/audit" },
      {
        key: "transfers",
        label: "Transfers",
        href: "/admin/inventory/transfers",
      },
      {
        key: "purchase-orders",
        label: "Purchase Orders",
        href: "/admin/inventory/purchase-orders",
      },
      { key: "packages", label: "Packages", href: "/admin/inventory/packages" },
      {
        key: "storage-locations",
        label: "Storage Locations",
        href: "/admin/inventory/storage-locations",
      },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: BookOpen,
    children: [
      { key: "products", label: "Products", href: "/admin/catalog/products" },
      {
        key: "classifications",
        label: "Classifications",
        href: "/admin/catalog/classifications",
      },
      { key: "brands", label: "Brands", href: "/admin/catalog/manufacturers" },
      {
        key: "product-matrix",
        label: "Product Matrix",
        href: "/admin/catalog/products/matrix",
      },
      { key: "tags", label: "Tags", href: "/admin/settings/tags" },
      { key: "strains", label: "Strains", href: "/admin/settings/strains" },
      {
        key: "suppliers",
        label: "Suppliers",
        href: "/admin/settings/suppliers",
      },
    ],
  },
  {
    key: "online-ordering",
    label: "Online Ordering",
    icon: Globe,
    children: [
      {
        key: "ecom-entities",
        label: "Ecom Entities",
        href: "/admin/ecomm/entities",
      },
      {
        key: "ecom-notifications",
        label: "Notifications",
        href: "/bleaum/notification/my-notification",
      },
      { key: "ecom-calendar", label: "Calendar", href: "/extensions/calendar" },
      {
        key: "ecom-loyalty",
        label: "Loyalty",
        href: "/bleaum/configurations/loyalty",
      },
      {
        key: "ecom-banners",
        label: "Banners",
        href: "/bleaum/configurations/banners",
      },
      {
        key: "ecom-chat-config",
        label: "Chat Config",
        href: "/bleaum/configurations/chat",
      },
      {
        key: "ecom-general",
        label: "General",
        href: "/bleaum/configurations/general",
      },
      {
        key: "ecom-spotlight",
        label: "Spotlight",
        href: "/bleaum/configurations/sections",
      },
      {
        key: "ecom-firebase",
        label: "Firebase",
        href: "/bleaum/configurations/firebase",
      },
      {
        key: "ecom-media-links",
        label: "Media Links",
        href: "/bleaum/configurations/media-links",
      },
      {
        key: "ecom-cover-page",
        label: "Cover Page",
        href: "/bleaum/configurations/cover-page",
      },
    ],
  },
  {
    key: "metrc",
    label: "METRC",
    icon: ShieldCheck,
    // Old app only shows this if org has METRC_REPORTING feature scope — apply that gate when wiring real data.
    children: [
      {
        key: "metrc-reconciliations",
        label: "METRC Reconciliations",
        href: "/admin/inventory/metrc-reconciliation/packages",
      },
      {
        key: "metrc-transfers",
        label: "METRC Transfers",
        href: "/admin/inventory/transfers/metrc-transfer",
      },
      {
        key: "metrc-configuration",
        label: "METRC Configuration",
        href: "/admin/settings/metrc-configuration",
      },
    ],
  },
  {
    key: "audit-logs",
    label: "Audit Logs",
    icon: FileText,
    children: [
      {
        key: "transactions",
        label: "Transactions",
        href: "/admin/audit/transactions",
      },
      {
        key: "ach-transactions",
        label: "ACH Transactions",
        href: "/admin/audit/ach-transactions",
      },
    ],
  },
  {
    key: "reports-analytics",
    label: "Reports & Analytics",
    icon: BarChart3,
    children: [
      {
        key: "analytics",
        label: "Analytics",
        children: [
          {
            key: "command-center",
            label: "Command Center",
            href: "/admin/sales-report/executive-summary",
          },
          {
            key: "performance-metrics",
            label: "Performance Metrics",
            href: "/admin/sales-report/performance",
          },
          {
            key: "sales-intelligence",
            label: "Sales Intelligence",
            href: "/admin/sales-report/sales-intelligence",
          },
          {
            key: "promo-performance",
            label: "Promo Performance",
            href: "/admin/sales-report/discounts",
          },
          {
            key: "sales-heatmap",
            label: "Sales Heatmap",
            href: "/admin/audit/day-and-time",
          },
          {
            key: "supply-tracker",
            label: "Supply Tracker",
            href: "/admin/audit/inventory-reorder",
          },
          {
            key: "referral-source",
            label: "Referral Source",
            href: "/admin/sales-report/referral-source-report",
          },
        ],
      },
      {
        key: "reporting",
        label: "Reporting",
        children: [
          {
            key: "report-customer",
            label: "Customer",
            href: "/admin/sales-report/customer-report",
          },
          {
            key: "report-inventory",
            label: "Inventory",
            href: "/admin/sales-report/inventory",
          },
          {
            key: "report-loyalty",
            label: "Loyalty",
            href: "/admin/sales-report/loyalty",
          },
          {
            key: "report-sales",
            label: "Sales",
            href: "/admin/sales-report/sales",
          },
          {
            key: "report-taxes",
            label: "Taxes",
            href: "/admin/sales-report/taxes",
          },
        ],
      },
    ],
  },
  {
    key: "cash-management",
    label: "Cash Mgmt",
    icon: Wallet,
    children: [
      {
        key: "main-vault",
        label: "Main Vault",
        href: "/admin/audit/cash-management",
      },
      {
        key: "registers",
        label: "Registers",
        href: "/admin/inventory/registers",
      },
      { key: "drawers", label: "Drawers", href: "/pos/drawers" },
    ],
  },
  {
    key: "access-management",
    label: "Access Mgmt",
    icon: UserCog,
    children: [
      { key: "team", label: "Team", href: "/admin/access-management/employee" },
      { key: "roles", label: "Roles", href: "/admin/access-management/role" },
      {
        key: "shifts",
        label: "Shifts",
        href: "/admin/access-management/employee-shift",
      },
    ],
  },
  {
    key: "delivery-management",
    label: "Delivery Mgmt",
    icon: Truck,
    children: [
      {
        key: "delivery",
        label: "Delivery",
        href: "/admin/delivery-management/delivery-profiles",
      },
      {
        key: "drivers",
        label: "Drivers",
        href: "/admin/delivery-management/persons",
      },
      {
        key: "vehicles",
        label: "Vehicles",
        href: "/admin/delivery-management/vehicle",
      },
      {
        key: "delivery-jobs",
        label: "Delivery Jobs",
        href: "/admin/delivery-management/jobs",
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      {
        key: "shop-preferences",
        label: "Shop Preferences",
        href: "/admin/settings/cashier",
      },
      {
        key: "integrations",
        label: "Integrations",
        href: "/admin/settings/integrations",
      },
      { key: "tasks", label: "Tasks", href: "/admin/tasks/tasks-listings" },
      {
        key: "pricing-templates",
        label: "Pricing Templates",
        href: "/admin/settings/pricing-templates",
      },
      { key: "tax", label: "Tax", href: "/admin/settings/tax" },
      {
        key: "hardware-clients",
        label: "Hardware Clients",
        href: "/admin/hardware-clients",
      },
      { key: "labels", label: "Labels", href: "/admin/labels" },
      { key: "print", label: "Print", href: "/admin/print" },
      { key: "print-settings", label: "Print Settings", href: "/admin/print" },
      {
        key: "store-information",
        label: "Store Information",
        href: "/admin/settings/stores-information",
      },
      {
        key: "reset-password",
        label: "Reset Password",
        href: "/admin/change-password",
      },
    ],
  },
];
