"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getInventorySellableViaAdvertisedId } from "@/services/sales/inventorySellableViaAdvertisedId";
import { addLineItemsAction } from "@/store/slices/lineItemsSlice";
import { addToCart } from "@/store/slices/cartSlice";

/**
 * Refund flow — lists the sale's purchased line items and lets staff replace a
 * package with another sellable package (fetched by advertised id). Quantity
 * controls are read-only, matching the original.
 *
 * Props:
 *   cart              — current cart array.
 *   onAddSelectedDone — old `setAddSelected(false)`, fired after packages added.
 *   discountTypes     — passthrough (unused in UI, kept for parity).
 */
export default function RefundLineItems({ cart = [], discountTypes, onAddSelectedDone }: any) {
  const lineItems = useSelector((state: any) => state?.lineItems?.lineItems) || [];
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const dispatch = useDispatch();

  const [packagesData, setPackagesData] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  let formattedData;
  if (saleDetail && saleDetail.nonPackagedLineItems) {
    formattedData = saleDetail.nonPackagedLineItems.map((item) => ({
      productName: item?.snapShotData?.productName,
      inventoryId: item?.inventoryId,
      price: item?.unitPriceBeforeTax,
      deals: {
        name: item?.snapshotData?.productName,
        price: item?.unitPriceBeforeTax,
      },
      purchaseQuantity: item?.purchaseQuantity,
      advertisedId: saleDetail?.advertisedId,
      packageId: item?.packageId,
    }));
  }

  const data = Object.keys(saleDetail).length > 0 ? formattedData || [] : lineItems;

  const fetchSellablePackages = (advertisedPackageId) => {
    setPackagesLoading(true);
    getInventorySellableViaAdvertisedId(advertisedPackageId)
      .then((res) => {
        const { inventory } = res.data.data;
        if (inventory?.packagesInfo) {
          const updatedPackagesInfo = inventory.packagesInfo.map((item) => ({
            ...item,
            productName: inventory?.inventoryInfo?.productNameSnapShot,
            inventoryId: inventory?.inventoryInfo?.id,
            price: inventory?.inventoryInfo?.unitPrice,
            sellableUomShortForm: inventory?.inventoryInfo?.sellableUomShortForm,
            deals: {
              name: inventory?.inventoryInfo?.productNameSnapShot,
              price: inventory?.inventoryInfo?.unitPrice,
            },
          }));
          setPackagesData(updatedPackagesInfo);
        }
        setPackagesLoading(false);
      })
      .catch((err) => {
        setError(err?.error || err?.message);
        setPackagesLoading(false);
      });
  };

  const handleAddToState = () => {
    const selectedPackagesData = packagesData.filter((p) =>
      selectedRowKeys.includes(p.key)
    );
    setSelectedPackages(selectedPackagesData);
    onAddSelectedDone?.();
    dispatch(addToCart([...cart, ...selectedPackagesData]));
    dispatch(addLineItemsAction([...selectedPackages, ...selectedPackagesData]));
  };

  const toggleRow = (key) => {
    setSelectedRowKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Product Name</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Package ID</th>
              <th className="px-3 py-2 font-medium">Advertised ID</th>
              <th className="px-3 py-2 text-center font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((record, i) => (
              <tr key={record.packageId || i} className="border-t border-border">
                <td className="px-3 py-2 text-primary">{record?.productName}</td>
                <td className="px-3 py-2">{record?.price}</td>
                <td className="px-3 py-2">{record?.packageId}</td>
                <td className="px-3 py-2">{record?.advertisedId}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon-sm" disabled>
                      -
                    </Button>
                    <Input
                      className="w-12 text-center"
                      defaultValue={record?.purchaseQuantity || 0}
                      disabled
                    />
                    <Button size="icon-sm" disabled>
                      +
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVisible(true);
                      fetchSellablePackages(record?.packageId);
                    }}
                  >
                    Replace With
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible && (
        <div className="fixed inset-0 z-9990 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setVisible(false)}
          />
          <div className="relative z-1 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-card p-5 shadow-2xl">
            <div className="mb-3 text-base font-semibold">Add Line Items</div>
            {error && packagesData.length === 0 && (
              <div className="mb-3 rounded-lg border border-border bg-muted p-3 text-sm">
                {error}
              </div>
            )}
            {packagesLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium" />
                        <th className="px-3 py-2 font-medium">Package Name</th>
                        <th className="px-3 py-2 font-medium">Quantity Left</th>
                        <th className="px-3 py-2 font-medium">Expiry</th>
                        <th className="px-3 py-2 font-medium">Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packagesData.map((p) => (
                        <tr key={p.key} className="border-t border-border">
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={selectedRowKeys.includes(p.key)}
                              onCheckedChange={() => toggleRow(p.key)}
                            />
                          </td>
                          <td className="px-3 py-2">{p.name}</td>
                          <td className="px-3 py-2">{p?.quantityLeft ?? "-"}</td>
                          <td className="px-3 py-2">{p.expiry}</td>
                          <td className="px-3 py-2 text-[#5c8ec0]">
                            {p?.createdAt?.split("T")[0] ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedRowKeys.length > 0 && (
                  <Button className="mt-3" onClick={handleAddToState}>
                    Add Selected Packages
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
