"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleInventory } from "@/services/inventories/getSingle";
import { updateInventory } from "@/services/inventories/updateInventory";
import { updateInventoryEcommStatus } from "@/services/inventories/updateEcommStatus";
import { fetchUomList } from "@/services/uom/list";
import { fetchCustomerGroups } from "@/services/customerGroups/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import StorageLocations from "./StorageLocations";
import PricingDetails from "./PricingDetails";

function MultiSelectGroups({ groups, selected, onChange }) {
  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id]);
  };

  if (!groups.length) {
    return <p className="text-sm text-muted-foreground">No customer groups available</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <label key={group.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={selected.includes(group.id)} onCheckedChange={() => toggle(group.id)} />
          {group.name}
        </label>
      ))}
    </div>
  );
}

export default function EditInventoryForm({ inventoryId, onClose }: { inventoryId: string | number; onClose?: () => void }) {
  const { shopId } = useShop();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory_details");
  const [inventory, setInventory] = useState(null);
  const [uomOptions, setUomOptions] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);

  const [sellableUoMId, setSellableUoMId] = useState("");
  const [threshold, setThreshold] = useState("");
  const [restrictGroups, setRestrictGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [enableProjectedQty, setEnableProjectedQty] = useState(false);
  const [projectedQtyUomId, setProjectedQtyUomId] = useState("");
  const [projectedQtyConversionRate, setProjectedQtyConversionRate] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isDisabledFromIOSEcomm, setIsDisabledFromIOSEcomm] = useState(false);
  const [isDisabledFromAndroidEcomm, setIsDisabledFromAndroidEcomm] = useState(false);
  const [isDisabledFromWEBEcomm, setIsDisabledFromWEBEcomm] = useState(false);

  const [storagePayload, setStoragePayload] = useState(null);
  const [validateStorageUoms, setValidateStorageUoms] = useState(null);

  const loadInventory = async () => {
    if (!shopId || !inventoryId) return;
    setLoading(true);
    try {
      const [invRes, uomRes, groupRes] = await Promise.all([
        fetchSingleInventory(inventoryId, shopId),
        fetchUomList({ page: 1, limit: 200 }),
        fetchCustomerGroups(),
      ]);

      const data = invRes?.data?.data?.inventory;
      if (!data) {
        toast.error("Inventory item not found");
        return;
      }

      setInventory(data);
      setUomOptions(uomRes?.data?.data?.uoms ?? []);
      setCustomerGroups(groupRes?.data?.data?.customerGroups ?? []);

      setSellableUoMId(data.sellableUoMId ?? "");
      setThreshold(data.thresholdStock ?? "");
      setRestrictGroups((data.restrictedCustomerGroupIds ?? []).length > 0);
      setSelectedGroupIds(data.restrictedCustomerGroupIds ?? []);
      setEnableProjectedQty(!!(data.projectQtyUomId && data.projectQtyConversionRate));
      setProjectedQtyUomId(data.projectQtyUomId ?? "");
      setProjectedQtyConversionRate(data.projectQtyConversionRate ?? "");
      setIsActive(!!data.isActive);
      setIsDisabledFromIOSEcomm(!!data.isDisabledFromIOSEcomm);
      setIsDisabledFromAndroidEcomm(!!data.isDisabledFromAndroidEcomm);
      setIsDisabledFromWEBEcomm(!!data.isDisabledFromWEBEcomm);
    } catch (err) {
      toast.error(err?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, inventoryId]);

  const handleSave = async () => {
    if (validateStorageUoms && !validateStorageUoms()) {
      toast.error("Please select Unit of Measurement for all storage locations");
      return;
    }

    setSaving(true);
    try {
      const body = {
        shopId,
        inventoryId,
        sellableUoMId,
        isActive,
        thresholdTotalStock: threshold === "" ? null : Number(threshold),
        restrictedCustomerGroupIds: restrictGroups ? selectedGroupIds : [],
        projectedQtyUomId: enableProjectedQty ? projectedQtyUomId : null,
        projectedQtyConversionRate: enableProjectedQty
          ? Number(projectedQtyConversionRate)
          : null,
        storageLocationDisplayUoMs: storagePayload,
      };
      await updateInventory(body);
      await updateInventoryEcommStatus({
        id: inventoryId,
        shopId,
        isDisabledFromIOSEcomm,
        isDisabledFromAndroidEcomm,
        isDisabledFromWEBEcomm,
      });
      toast.success("Inventory information updated successfully");
      setEditMode(false);
      loadInventory();
    } catch (err) {
      toast.error(err?.message || "Failed to update inventory");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Inventory item not found.</div>
    );
  }

  const sellableUomOptions = uomOptions.filter((u) => u.applicationType === "SELLABLE_STOCK");
  const currentUom = uomOptions.find((u) => u.id === sellableUoMId);
  if (currentUom && !sellableUomOptions.some((u) => u.id === currentUom.id)) {
    sellableUomOptions.unshift(currentUom);
  }

  const TAB_ITEMS = [
    { value: "inventory_details", label: "Inventory Details" },
    { value: "pricing_details", label: "Pricing Details" },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit Inventory</h1>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button
                variant="outline"
                className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
                onClick={() => { setEditMode(false); loadInventory(); }}
              >
                Cancel
              </Button>
              <Button
                className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={() => setEditMode(true)}>
              Edit
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-gray-200">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory_details" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/catalog/products?id=${inventory.productId}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                {inventory.productName}
                <ExternalLink className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>
                Configure unit of measurement, stock thresholds, and restrictions
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Sellable Unit of Measurement</Label>
                  <Select
                    items={sellableUomOptions.map((u) => ({ value: u.id, label: u.name }))}
                    value={sellableUoMId}
                    onValueChange={setSellableUoMId}
                    disabled={!editMode}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellableUomOptions.map((uom) => (
                        <SelectItem key={uom.id} value={uom.id}>{uom.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Stock Threshold</Label>
                  <Input
                    type="number"
                    className="h-9"
                    placeholder="Enter threshold quantity"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-[#F9FAFB] p-6 ring-1 ring-foreground/10">
                  <Label className="mb-3">Customer Group Restriction</Label>
                  <div className="mb-3 flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={restrictGroups}
                        onChange={() => setRestrictGroups(true)}
                        disabled={!editMode}
                      />
                      Enable Restriction
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={!restrictGroups}
                        onChange={() => setRestrictGroups(false)}
                        disabled={!editMode}
                      />
                      No Restriction
                    </label>
                  </div>
                  {restrictGroups && (
                    editMode ? (
                      <MultiSelectGroups
                        groups={customerGroups}
                        selected={selectedGroupIds}
                        onChange={setSelectedGroupIds}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedGroupIds.length ? (
                          selectedGroupIds.map((id) => (
                            <span
                              key={id}
                              className="inline-block rounded bg-muted px-2.5 py-1 text-xs font-medium"
                            >
                              {customerGroups.find((g) => g.id === id)?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Available to all customer groups</span>
                        )}
                      </div>
                    )
                  )}
                </div>

                <div className="rounded-lg bg-[#F9FAFB] p-6 ring-1 ring-foreground/10">
                  <label className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={enableProjectedQty}
                      disabled={!editMode}
                      onCheckedChange={(checked) => {
                        setEnableProjectedQty(!!checked);
                        if (!checked) {
                          setProjectedQtyUomId("");
                          setProjectedQtyConversionRate("");
                        }
                      }}
                    />
                    Enable Unit Conversion
                  </label>
                  {enableProjectedQty && (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Target Unit of Measure</Label>
                        <Select
                          items={uomOptions.map((u) => ({ value: u.id, label: u.name }))}
                          value={projectedQtyUomId}
                          onValueChange={setProjectedQtyUomId}
                          disabled={!editMode}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select target UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            {uomOptions.map((uom) => (
                              <SelectItem key={uom.id} value={uom.id}>{uom.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Conversion Rate</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 12 (if 12 pieces = 1 dozen)"
                          value={projectedQtyConversionRate}
                          onChange={(e) => setProjectedQtyConversionRate(e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Package Details</CardTitle>
              <CardDescription>Manage inventory across different storage locations</CardDescription>
            </CardHeader>
            <CardContent>
              <StorageLocations
                editMode={editMode}
                storageLocationData={inventory.storageLocationData}
                sellableUoMId={sellableUoMId}
                allUomOptions={uomOptions}
                onChange={setStoragePayload}
                registerValidator={(fn) => setValidateStorageUoms(() => fn)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Inventory Status</h4>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Active and available for sales" : "Disabled and not available for sales"}
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={!editMode} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Channel Availability</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {[
                {
                  label: "Available on iOS App",
                  disabled: isDisabledFromIOSEcomm,
                  setDisabled: setIsDisabledFromIOSEcomm,
                },
                {
                  label: "Available on Android App",
                  disabled: isDisabledFromAndroidEcomm,
                  setDisabled: setIsDisabledFromAndroidEcomm,
                },
                {
                  label: "Available on Web Store",
                  disabled: isDisabledFromWEBEcomm,
                  setDisabled: setIsDisabledFromWEBEcomm,
                },
              ].map((channel) => (
                <div key={channel.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">{channel.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      Switch is {channel.disabled ? "OFF" : "ON"}: this product is{" "}
                      {channel.disabled ? "hidden from" : "visible in"} the {channel.label.replace("Available on ", "")}.
                    </p>
                  </div>
                  <Switch
                    checked={!channel.disabled}
                    onCheckedChange={(checked) => channel.setDisabled(!checked)}
                    disabled={!editMode}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "pricing_details" && (
        <PricingDetails
          inventoryId={inventoryId}
          shopId={shopId}
          editMode={editMode}
          inventoryData={inventory}
          sellableUoMId={sellableUoMId}
          onSaveSuccess={loadInventory}
        />
      )}
    </div>
  );
}
