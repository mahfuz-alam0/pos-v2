"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { IdCard, Plus, BarChart3, ShoppingCart, Network, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { getCustomerSalesStats } from "@/services/stats/customerSalesStats";
import { getCustomerTopCategories } from "@/services/stats/customerTopCategories";
import { listUoms } from "@/services/uoms/listUoms";

// Ported from components/customer-panel-popovers.js. antd Popover/Tooltip/
// Progress + custom SVG icons -> shadcn Popover/Tooltip + lucide icons. All
// business calculations (avg spend, sales/month, license formatting, per-visit
// limit progress) are preserved exactly. Theme-branching (THEME_TYPE_DARK) is
// dropped — the new UI is theme-aware via CSS.

function PurchaseHabits({ selectedCustomer }) {
  const [averageSpend, setAverageSpend] = useState<any>(0);
  const [lastSaleAmount, setLastSaleAmount] = useState<any>(0);
  const [averageSalesPerMonth, setAverageSalesPerMonth] = useState<any>(0);

  useEffect(() => {
    if (!selectedCustomer) return;
    getCustomerSalesStats(selectedCustomer.id)
      .then((res) => {
        const { amountOfSales, numberOfSales, firstSaleDate, lastSaleAmount, createdAt } =
          res.data.data.stat;
        setAverageSpend(numberOfSales > 0 ? (amountOfSales / numberOfSales).toFixed(2) : 0);
        setLastSaleAmount(lastSaleAmount);

        const firstSale = new Date(createdAt);
        const now = new Date();
        const totalMonths =
          (now.getFullYear() - firstSale.getFullYear()) * 12 +
          (now.getMonth() - firstSale.getMonth());
        setAverageSalesPerMonth(
          totalMonths > 0 ? (numberOfSales / totalMonths).toFixed(2) : 0
        );
      })
      .catch((error) => console.error("Error fetching sale stats:", error));
  }, [selectedCustomer]);

  if (averageSpend === 0 && lastSaleAmount === 0) {
    return <div>No purchase habits data available.</div>;
  }
  return (
    <div className="space-y-1">
      <div>
        Avg Spend: <span className="font-medium">${averageSpend}</span>
      </div>
      <div>
        Last Sale: <span className="font-medium">${lastSaleAmount}</span>
      </div>
      <div>
        {averageSalesPerMonth < 1 ? (
          <span>Less than 1 sale/month</span>
        ) : (
          <span>About {averageSalesPerMonth} sales/month</span>
        )}
      </div>
    </div>
  );
}

function TopCategories({ selectedCustomer }) {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    if (!selectedCustomer) return;
    getCustomerTopCategories(selectedCustomer.id)
      .then((res) => setCategories(res.data.data.categories))
      .catch((error) => console.error("Error fetching categories:", error));
  }, [selectedCustomer]);

  if (categories.length === 0) return <div>No top categories data available.</div>;
  return (
    <div className="space-y-1">
      {categories.map((category) => (
        <div key={category.categoryId}>
          {category.name}:{" "}
          <span className="font-medium">
            {+category?.totalTimesBought?.toFixed(2)} x bought
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomerLimits({ getOrderSummary }) {
  const [uoms, setUoms] = useState([]);
  useEffect(() => {
    listUoms()
      .then((res) => setUoms(res.data.data.uoms))
      .catch((error) => toast.error(error?.message || "An error occurred"));
  }, []);

  const rulesTrace = getOrderSummary?.data?.metaData?.rulesTrace;
  if (!rulesTrace?.length || getOrderSummary?.data?.customerGroupId === null) {
    return <div>No customer limits data available.</div>;
  }

  return (
    <div className="max-h-[400px] w-full overflow-y-auto">
      {rulesTrace.map((category, index) => {
        const measured =
          category?.measurementType === "TOTAL_QUANTITIES"
            ? category?.totalPurchasedQuantity || 0
            : category?.totalPurchasedWeight || 0;
        const percent = Math.min(
          100,
          Math.max(0, (measured / (category?.targetLimit || 1)) * 100)
        );
        const uomName = (() => {
          const ref = category?.targetCategoryRefs?.[0];
          if (!ref) return "";
          const uom = uoms.find((item) => item.id === ref.split(":")[1]);
          return uom ? uom.name : "";
        })();
        return (
          <div key={index} className="mb-4 rounded-lg border border-border bg-muted/50 p-3">
            <div className="mb-2 flex justify-between">
              <h3 className="min-w-30 text-sm font-medium">Type</h3>
              <span className="break-words text-right text-[13px]">{category?.name ?? "N/A"}</span>
            </div>
            <div className="mb-2 flex justify-between">
              <h3 className="min-w-30 text-sm font-medium">Measurement Type</h3>
              <span className="text-right text-[13px]">
                {category?.measurementType === "TOTAL_QUANTITIES" ? "Total Quantity" : "Total Weight"}
              </span>
            </div>
            <div className="mb-2 flex justify-between">
              <h3 className="min-w-30 text-sm font-medium">Strategy</h3>
              <span className="break-words text-right text-[13px]">
                {category?.orderConsiderationStrategy
                  ? category.orderConsiderationStrategy
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(" ")
                  : "N/A"}
              </span>
            </div>
            <div className="mt-3">
              <div className="mb-2 flex justify-between">
                <h3 className="text-sm font-medium">Progress</h3>
                <span className="text-xs text-muted-foreground">
                  {measured} / {category?.targetLimit || 0}
                </span>
              </div>
              <div className="mb-2 h-2 w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded"
                  style={{ width: `${percent}%`, backgroundColor: category?.colorCode || "#1890ff" }}
                />
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                Limit: {category?.targetLimit ?? "N/A"} {uomName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatLicenseNumber(license) {
  if (!license) return "";
  const cleaned = license.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const segments = [2, 4, 4, 4, 4, 4, 2];
  let result = "";
  let pos = 0;
  for (let i = 0; i < segments.length; i++) {
    const segment = cleaned.slice(pos, pos + segments[i]);
    if (segment) {
      result += segment;
      if (i < segments.length - 1 && segment.length === segments[i]) result += "-";
    }
    pos += segments[i];
  }
  return result;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Medical license copied to clipboard!");
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    toast.success("Medical license copied to clipboard!");
  }
}

export default function CustomerPanelPopovers({
  selectedCustomer,
  quoteBody,
  fullSelectedCustomer,
  onPlusClick,
  onDLIconClick,
}: any) {
  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);
  const [medLicenseNo, setMedLicenseNo] = useState<any>();

  useEffect(() => {
    if (selectedCustomer) {
      setMedLicenseNo(formatLicenseNumber(selectedCustomer?.medicalLicense));
    }
  }, [selectedCustomer]);

  return (
    <div className="flex flex-row items-center gap-2">
      {/* DL icon (front image present) or upload-plus */}
      {fullSelectedCustomer?.drivingLicenseFrontImage ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon"
                className="size-11"
                onClick={(e) => {
                  e.stopPropagation();
                  onDLIconClick?.();
                }}
              >
                <IdCard className="size-5" />
              </Button>
            }
          />
          <TooltipContent>View Front DL</TooltipContent>
        </Tooltip>
      ) : (
        onPlusClick && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  className="size-11"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlusClick();
                  }}
                >
                  <Plus className="size-5" />
                </Button>
              }
            />
            <TooltipContent>Upload DL</TooltipContent>
          </Tooltip>
        )
      )}

      {selectedCustomer?.customerGroups?.length > 0 && (
        <Popover>
          <PopoverTrigger
            render={
              <Button size="icon" variant="outline" className="size-11">
                <BarChart3 className="size-5" />
              </Button>
            }
          />
          <PopoverContent className="w-96">
            <p className="mb-3 text-center text-sm font-semibold">Per Visit Limits</p>
            <CustomerLimits getOrderSummary={getOrderSummary} />
          </PopoverContent>
        </Popover>
      )}

      <Popover>
        <PopoverTrigger
          render={
            <Button size="icon" variant="outline" className="size-11">
              <ShoppingCart className="size-5" />
            </Button>
          }
        />
        <PopoverContent>
          <p className="mb-2 text-sm font-semibold">Purchase Habits</p>
          <PurchaseHabits selectedCustomer={selectedCustomer} />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={
            <Button size="icon" variant="outline" className="size-11">
              <Network className="size-5" />
            </Button>
          }
        />
        <PopoverContent>
          <p className="mb-2 text-sm font-semibold">Top Categories</p>
          <TopCategories selectedCustomer={selectedCustomer} />
        </PopoverContent>
      </Popover>

      {(selectedCustomer?.medicalLicense || selectedCustomer?.mjMedicalData?.medicalLicense) && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon"
                className="size-11 bg-[#018FDE] text-white hover:bg-[#018FDE]/90"
                onClick={() => copyToClipboard(selectedCustomer?.medicalLicense)}
              >
                <Copy className="size-5" />
              </Button>
            }
          />
          <TooltipContent>Copy Med License {medLicenseNo}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
