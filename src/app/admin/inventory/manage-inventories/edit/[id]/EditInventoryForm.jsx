"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleInventory } from "@/services/inventories/getSingle";
import { updateInventory } from "@/services/inventories/updateInventory";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

export default function EditInventoryForm({ inventoryId }) {
  const router = useRouter();
  const { shopId } = useShop();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (!shopId || !inventoryId) return;
    (async () => {
      setLoading(true);
      try {
        const [invRes, uomRes, groupRes] = await Promise.all([
          fetchSingleInventory(inventoryId, shopId),
          fetchUomList(),
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
      } catch (err) {
        toast.error(err?.message || "Failed to load inventory");
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId, inventoryId]);

  const handleSave = async () => {
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
      };
      await updateInventory(body);
      toast.success("Inventory information updated successfully");
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

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit Inventory</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/inventory/manage-inventories")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory_details">
        <TabsList>
          <TabsTrigger value="inventory_details">Inventory Details</TabsTrigger>
          <TabsTrigger value="pricing_details" disabled>
            Pricing Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory_details" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/admin/catalog/products/edit/${inventory.productId}`}
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
                  <Select value={sellableUoMId} onValueChange={setSellableUoMId}>
                    <SelectTrigger className="w-full">
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
                    placeholder="Enter threshold quantity"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <Label className="mb-3">Customer Group Restriction</Label>
                  <div className="mb-3 flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={restrictGroups}
                        onChange={() => setRestrictGroups(true)}
                      />
                      Enable Restriction
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={!restrictGroups}
                        onChange={() => setRestrictGroups(false)}
                      />
                      No Restriction
                    </label>
                  </div>
                  {restrictGroups && (
                    <MultiSelectGroups
                      groups={customerGroups}
                      selected={selectedGroupIds}
                      onChange={setSelectedGroupIds}
                    />
                  )}
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <label className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={enableProjectedQty}
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
                        <Select value={projectedQtyUomId} onValueChange={setProjectedQtyUomId}>
                          <SelectTrigger className="w-full">
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
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
