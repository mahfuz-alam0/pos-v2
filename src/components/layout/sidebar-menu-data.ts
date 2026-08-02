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
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  key: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
}

// Retail menu tree — ported from old app's SidebarContent.js (currentMenu === "retail").
// Each item: { key, label, href } (leaf) or { key, label, icon, children } (section).
export const retailMenu: MenuItem[] = [
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
      { key: "pos-tablet", label: "POS", href: "/pos" },
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
      { key: "coupons", label: "Coupons", href: "/promotions/coupons" },
      { key: "deals", label: "Deals", href: "/promotions/deals" },
      {
        key: "loyalty-reward-settings",
        label: "Loyalty Reward Settings",
        href: "/promotions/loyalty",
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
        key: "inventory-reorder",
        label: "Inventory Reorder",
        href: "/reports-analytics/inventory-reorder",
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
      { key: "products", label: "Products", href: "/catalog/products" },
      {
        key: "classifications",
        label: "Classifications",
        href: "/catalog/classifications",
      },
      { key: "brands", label: "Brands", href: "/catalog/manufacturers" },
      {
        key: "product-matrix",
        label: "Product Matrix",
        href: "/catalog/products/matrix",
      },
      { key: "tags", label: "Tags", href: "/catalog/tags" },
      { key: "strains", label: "Strains", href: "/catalog/strains" },
      {
        key: "suppliers",
        label: "Suppliers",
        href: "/catalog/suppliers",
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
        href: "/metrc/reconciliations",
      },
      {
        key: "metrc-transfers",
        label: "METRC Transfers",
        href: "/metrc/transfers",
      },
      {
        key: "metrc-configuration",
        label: "METRC Configuration",
        href: "/metrc/configuration",
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
        href: "/audit-logs/transactions",
      },
      {
        key: "ach-transactions",
        label: "ACH Transactions",
        href: "/audit-logs/ach-transactions",
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
            href: "/reports-analytics/executive-summary",
          },
          {
            key: "performance-metrics",
            label: "Performance Metrics",
            href: "/reports-analytics/performance",
          },
          {
            key: "sales-intelligence",
            label: "Sales Intelligence",
            href: "/reports-analytics/sales-intelligence",
          },
          {
            key: "promo-performance",
            label: "Promo Performance",
            href: "/reports-analytics/discounts",
          },
          {
            key: "sales-heatmap",
            label: "Sales Heatmap",
            href: "/reports-analytics/day-and-time",
          },
          {
            key: "supply-tracker",
            label: "Supply Tracker",
            href: "/reports-analytics/inventory-reorder",
          },
          {
            key: "referral-source",
            label: "Referral Source",
            href: "/reports-analytics/referral-source-report",
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
            href: "/reports-analytics/customer-report",
          },
          {
            key: "report-inventory",
            label: "Inventory",
            href: "/reports-analytics/inventory",
          },
          {
            key: "report-loyalty",
            label: "Loyalty",
            href: "/reports-analytics/loyalty",
          },
          {
            key: "report-sales",
            label: "Sales",
            href: "/reports-analytics/sales",
          },
          {
            key: "report-taxes",
            label: "Taxes",
            href: "/reports-analytics/taxes",
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
        href: "/cash-management/main-vault",
      },
      {
        key: "registers",
        label: "Registers",
        href: "/cash-management/registers",
      },
      { key: "drawers", label: "Drawers", href: "/pos/drawers" },
    ],
  },
  {
    key: "access-management",
    label: "Access Mgmt",
    icon: UserCog,
    children: [
      { key: "team", label: "Team", href: "/access-management/employee" },
      { key: "roles", label: "Roles", href: "/access-management/role" },
      {
        key: "shifts",
        label: "Shifts",
        href: "/access-management/employee-shift",
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
        href: "/delivery-management/delivery-profiles",
      },
      {
        key: "drivers",
        label: "Drivers",
        href: "/delivery-management/persons",
      },
      {
        key: "vehicles",
        label: "Vehicles",
        href: "/delivery-management/vehicle",
      },
      {
        key: "delivery-jobs",
        label: "Delivery Jobs",
        href: "/delivery-management/jobs",
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
        href: "/settings/cashier",
      },
      {
        key: "integrations",
        label: "Integrations",
        href: "/settings/integrations",
      },
      { key: "tasks", label: "Tasks", href: "/settings/tasks-listings" },
      {
        key: "pricing-templates",
        label: "Pricing Templates",
        href: "/settings/pricing-templates",
      },
      { key: "tax", label: "Tax", href: "/settings/tax" },
      {
        key: "hardware-clients",
        label: "Hardware Clients",
        href: "/settings/hardware-clients",
      },
      { key: "labels", label: "Labels", href: "/settings/labels" },
      { key: "print", label: "Print Settings", href: "/settings/print" },
      {
        key: "store-information",
        label: "Store Information",
        href: "/settings/stores-information",
      },
      {
        key: "reset-password",
        label: "Reset Password",
        href: "/settings/change-password",
      },
    ],
  },
];
