"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { TrendingUp, ChevronDown } from "lucide-react";

import ProductsCart from "@/components/pos/ProductsCart";
import { getCustomerSalesStats } from "@/services/stats/customerSalesStats";
import { getCustomerLoyaltyStatus } from "@/services/loyalty/getCustomerLoyaltyStatus";
import { getCustomerProductStats } from "@/services/stats/getCustomerProductStats";
import { getCustomerTopCategories } from "@/services/stats/customerTopCategories";
import { getCustomerTopBrands } from "@/services/stats/customerTopBrands";
import { listUoms } from "@/services/uoms/listUoms";

const BLUE = "#0190DD";

function DailyLimits() {
  const rulesTrace = useSelector(
    (state: any) => state?.quoteForSale?.lineItems?.data?.metaData?.rulesTrace
  );
  const [uoms, setUoms] = useState<any[]>([]);

  useEffect(() => {
    listUoms().then((res) => setUoms(res?.data?.data?.uoms || []));
  }, []);

  if (!rulesTrace?.length) return null;

  return (
    <div>
      <div
        className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: BLUE }}
      >
        <TrendingUp className="size-3" />
        Daily Limits
      </div>
      <div className="space-y-2">
        {rulesTrace.map((category, i) => {
          const measured =
            category?.measurementType === "TOTAL_QUANTITIES"
              ? category?.totalPurchasedQuantity || 0
              : category?.totalPurchasedWeight || 0;
          const percent = Math.min(
            100,
            Math.max(0, (measured / (category?.targetLimit || 1)) * 100)
          );
          const uomRef = category?.targetCategoryRefs?.[0];
          const uom = uomRef
            ? uoms.find((u) => u.id === uomRef.split(":")[1])
            : null;
          const uomLabel = uom?.targetUom?.shortForm || uom?.name || "";
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-xs text-white/85">
                <span>{category?.name ?? "N/A"}</span>
                <span>
                  {category?.targetLimit ?? "N/A"} {uomLabel}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(1,144,221,0.15)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: percent >= 80 ? "#ff4d4f" : BLUE,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopProducts({ customerId }) {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    if (!customerId) return;
    getCustomerProductStats(customerId).then((res) =>
      setProducts(res?.data?.data?.products || [])
    );
  }, [customerId]);

  if (!products?.length) return null;

  return (
    <div>
      <div
        className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: BLUE }}
      >
        Top Products
      </div>
      <div className="space-y-1.5">
        {products.slice(0, 3).map((item, i) => (
          <div
            key={item.productId ?? i}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-white/85 hover:bg-[#FA8D15]/10 hover:text-[#FA8D15]"
          >
            <span
              className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: "rgba(1,144,221,0.2)", color: BLUE }}
            >
              {i + 1}
            </span>
            <span className="truncate">{item?.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopPillList({ title, items, labelKey }) {
  if (!items?.length) return null;
  return (
    <div>
      <div
        className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: BLUE }}
      >
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 3).map((item, i) => (
          <span
            key={item.categoryId ?? item.brandId ?? i}
            className="rounded-full px-2.5 py-1 text-xs text-white/85 hover:border-[#FA8D15] hover:text-[#FA8D15]"
            style={{ border: "1px solid rgba(1,144,221,0.45)" }}
          >
            {item[labelKey]}
          </span>
        ))}
      </div>
    </div>
  );
}

function CustomerInsights({ customerId }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    if (!customerId) return;
    getCustomerTopCategories(customerId).then((res) =>
      setCategories(res?.data?.data?.categories || [])
    );
    getCustomerTopBrands(customerId).then((res) =>
      setBrands(res?.data?.data?.brands || [])
    );
  }, [customerId]);

  return (
    <div
      className="mt-3 overflow-hidden rounded-[10px]"
      style={{
        background: "rgba(1,144,221,0.07)",
        border: "1px solid rgba(1,144,221,0.25)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: BLUE }}
      >
        <span className="flex items-center gap-1">
          <TrendingUp className="size-3.5" />
          Customer Insights
        </span>
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-4 px-3 pb-3">
          <DailyLimits />
          <TopProducts customerId={customerId} />
          <TopPillList title="Top Categories" items={categories} labelKey="name" />
          <TopPillList title="Top Brands" items={brands} labelKey="name" />
        </div>
      )}
    </div>
  );
}

// Ported from PosTabletMode/ProductsPopupSideBar.jsx — the customer summary
// + cart column shown alongside the product grid while browsing.
export default function CustomerCartSidebar() {
  const selectedCustomer = useSelector(
    (state: any) => state.customer?.selectedCustomer
  );

  const [avgSpend, setAvgSpend] = useState(0);
  const [orders, setOrders] = useState(0);
  const [loyalty, setLoyalty] = useState<any>(null);

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setAvgSpend(0);
      setOrders(0);
      setLoyalty(null);
      return;
    }
    getCustomerSalesStats(selectedCustomer.id)
      .then((res) => {
        const { amountOfSales, numberOfSales } = res?.data?.data?.stat || {};
        setAvgSpend(numberOfSales > 0 ? amountOfSales / numberOfSales : 0);
        setOrders(numberOfSales || 0);
      })
      .catch(() => {});
    getCustomerLoyaltyStatus(selectedCustomer.id)
      .then((res) => setLoyalty(res?.data?.data?.info || null))
      .catch(() => setLoyalty(null));
  }, [selectedCustomer?.id]);

  const customerName = selectedCustomer
    ? `${selectedCustomer.firstName || ""} ${selectedCustomer.lastName || ""}`.trim()
    : "";
  const groupName =
    !selectedCustomer || !selectedCustomer.customerGroups?.length
      ? "No Group"
      : selectedCustomer.customerGroups[0]?.name;

  return (
    <div>
      {selectedCustomer && (
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-bold text-primary"
              style={{ border: `2px solid ${BLUE}` }}
            >
              {selectedCustomer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCustomer.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                (selectedCustomer.firstName || "?")[0].toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold">
                {customerName || "No customer selected"}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-4.5 text-white" style={{ background: "#389e0d" }}>
                  {selectedCustomer.customerType ?? "No Type"}
                </span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-4.5 text-white" style={{ background: BLUE }}>
                  {groupName}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ["Avg Spend", `$${avgSpend.toFixed(2)}`],
              ["Points", loyalty?.userLoyaltyStatus?.currentLoyaltyPoints ?? 0],
              ["Orders", orders],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-lg p-2"
                style={{
                  background: "rgba(1,144,221,0.08)",
                  border: "1px solid rgba(1,144,221,0.25)",
                }}
              >
                <div className="text-[10px] text-white/50">{label}</div>
                <div className="text-[13px] font-bold">{value}</div>
              </div>
            ))}
          </div>

          <CustomerInsights customerId={selectedCustomer.id} />
        </div>
      )}

      <div className="mb-2 font-semibold">Cart Items</div>
      <ProductsCart />
    </div>
  );
}
