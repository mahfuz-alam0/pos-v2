"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const defaultImage = "/images/placeholders/product.svg";

// Minimal page control replacing antd <Pagination>. Preserves the same
// page/limit/totalEntries contract and onChange(page) callback.
function Pagination({ page, limit, totalEntries, onChange }) {
  const totalPages = Math.max(1, Math.ceil((totalEntries || 0) / (limit || 1)));
  const cur = page || 1;
  if (totalPages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-center gap-2 text-sm">
      <button
        className="rounded border px-2 py-1 disabled:opacity-40"
        disabled={cur <= 1}
        onClick={() => onChange(cur - 1)}
      >
        Prev
      </button>
      <span>
        Page {cur} / {totalPages}
      </span>
      <button
        className="rounded border px-2 py-1 disabled:opacity-40"
        disabled={cur >= totalPages}
        onClick={() => onChange(cur + 1)}
      >
        Next
      </button>
    </div>
  );
}

function ProductImage({ src, alt = "" }) {
  const [errored, setErrored] = useState(false);
  if (errored || !src) {
    return (
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" className="opacity-20">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="1.4" />
        <path
          d="M3 16l5-5 4 4 3-3 6 6"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="8.5" r="1.5" fill="#fff" />
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ""}
      onError={() => setErrored(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
    />
  );
}

// Ported from PosTabletMode/ProductsPopupProductCard.jsx — real stock-status
// (Healthy / Low Stock / Out of Stock) driven by
// totalSellableQuantityOnPhysicalStore vs thresholdStock, real THC/CBD pills
// from productInfo.cannabisProductData, and the dark card treatment. Card
// markup/logic preserved; styled-components → Tailwind, antd Image → plain
// <img> with an inline SVG placeholder.
function ProductCard({ product, onClick }) {
  const totalSellable = product?.totalSellableQuantityOnPhysicalStore ?? 0;
  const threshold = product?.thresholdStock;

  let stockStatus = "";
  if (totalSellable <= 0) {
    stockStatus = "Out of Stock";
  } else if (threshold && totalSellable < threshold) {
    stockStatus = "Low Stock";
  } else if (totalSellable > (threshold ?? 0)) {
    stockStatus = "Healthy";
  }

  const borderColor =
    stockStatus === "Healthy"
      ? "rgba(34,139,34,0.55)"
      : stockStatus === "Low Stock"
      ? "rgba(225,163,30,0.6)"
      : stockStatus === "Out of Stock"
      ? "rgba(239,68,68,0.55)"
      : "rgba(148,163,184,0.35)";

  const stockBg =
    stockStatus === "Healthy"
      ? "rgba(22,163,74,0.82)"
      : stockStatus === "Low Stock"
      ? "rgba(202,138,4,0.82)"
      : stockStatus === "Out of Stock"
      ? "rgba(220,38,38,0.82)"
      : "rgba(100,116,139,0.7)";

  const conversionRate = product?.projectQtyConversionRate;
  const price = (
    conversionRate > 0 ? conversionRate * product.unitPrice : product?.unitPrice ?? 0
  ).toFixed(2);
  const unit =
    conversionRate > 0
      ? product?.projectQtyUomShortForm
      : product?.sellableUoMShortForm || "ea";

  const thc = product?.productInfo?.cannabisProductData?.thcData?.value;
  const cbd = product?.productInfo?.cannabisProductData?.cbdData?.value;
  const imgUrl =
    product?.productInfo?.images?.[0]?.url ||
    (typeof product?.images?.[0] === "string" ? product.images[0] : product?.images?.[0]?.url);

  return (
    <div
      className="group relative h-40 cursor-pointer overflow-hidden rounded-2xl bg-[#1a2238] shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{ border: `2px solid ${borderColor}` }}
      onClick={onClick}
    >
      {imgUrl ? (
        <ProductImage src={imgUrl} alt={product?.productName} />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #1a2540 0%, #243055 50%, #1c2a42 100%)",
          }}
        >
          <ProductImage src={null} />
        </div>
      )}

      {/* Stock + THC/CBD — top left, stacked */}
      <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
        {stockStatus && (
          <span
            className="rounded-full px-2 py-1 text-[9px] font-bold text-white shadow"
            style={{ background: stockBg, backdropFilter: "blur(6px)" }}
          >
            {stockStatus}
          </span>
        )}
        {(thc > 0 || cbd > 0) && (
          <div className="flex gap-1">
            {thc > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow"
                style={{ background: "rgba(22,163,74,0.88)" }}
              >
                THC: {thc}
              </span>
            )}
            {cbd > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow"
                style={{ background: "rgba(37,99,235,0.88)" }}
              >
                CBD: {cbd}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom gradient bar — name + price */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 px-3 pb-2.5 pt-9"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, transparent 100%)",
        }}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="line-clamp-2 min-w-0 flex-1 text-xs font-bold leading-tight text-white [text-shadow:0_1px_5px_rgba(0,0,0,0.7)]">
                {product?.productName ?? "N/A"}
              </div>
            }
          />
          <TooltipContent>{product?.productName ?? "N/A"}</TooltipContent>
        </Tooltip>
        <div className="shrink-0 text-right text-[15px] font-bold leading-tight text-white [text-shadow:0_1px_5px_rgba(0,0,0,0.7)]">
          ${price}
          <em className="block text-[9px] font-normal not-italic opacity-70">/{unit}</em>
        </div>
      </div>
    </div>
  );
}

export default function ProductGridView({
  noScroll = false,
  data = [],
  paginationData,
  onPageChange,
  setShowDetail,
  fetchSellablePackages,
  setFetchModalProductDetails,
  setSelectedRowKeys,
}) {
  return (
    <div
      style={{ height: "100%", overflowY: noScroll ? "hidden" : "auto", overflowX: "hidden" }}
    >
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {data.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => {
              setShowDetail?.(true);
              setSelectedRowKeys?.([]);
              setFetchModalProductDetails?.(product);
              fetchSellablePackages?.(product.productId);
            }}
          />
        ))}
      </div>

      <Pagination
        page={paginationData?.page}
        limit={paginationData?.limit}
        totalEntries={paginationData?.totalEntries}
        onChange={onPageChange}
      />
    </div>
  );
}
