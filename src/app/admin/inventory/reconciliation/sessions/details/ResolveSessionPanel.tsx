"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchPackageAdjustments } from "@/services/packageAdjustments/list";
import { fetchPackageAdjustment } from "@/services/packageAdjustments/getSingle";
import { approvePackageAdjustment } from "@/services/packageAdjustments/approve";
import { fetchMetrcAdjustmentReasons } from "@/services/metrc/adjustmentReasons";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResolveSessionPanelProps {
  productId: string | number | null;
  sessionData: any;
  onBack: () => void;
}

export default function ResolveSessionPanel({ productId, sessionData, onBack }: ResolveSessionPanelProps) {
  const { shopId } = useShop();
  const [rows, setRows] = useState<any[]>([]);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [packageReasons, setPackageReasons] = useState<Record<string, string>>({});
  const [initiationReasonMetrc, setInitiationReasonMetrc] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
  const [activityPopoverKey, setActivityPopoverKey] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrcAdjustmentReasons(shopId)
      .then((res) => setInitiationReasonMetrc(res?.data?.reasons ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!shopId || !sessionData?.id || !productId) return;
    fetchPackageAdjustments(shopId, {
      limit: 30,
      page: 1,
      originSessionId: sessionData.id,
      originSessionProductId: productId,
    })
      .then((res) => {
        const adjustments = res?.data?.adjustments ?? [];
        setRows(adjustments.map((item: any) => ({ ...item, key: item.id })));
        const initial: Record<string, boolean> = {};
        adjustments.forEach((pkg: any) => {
          initial[pkg.packageId] = pkg.isApproved;
        });
        setToggleStates(initial);
      })
      .catch((err) => console.error(err));
  }, [shopId, sessionData?.id, productId]);

  const handleReasonChange = (value: string, packageId: string, isPlatformSource: boolean) => {
    setPackageReasons((prev) => ({
      ...prev,
      [packageId]: isPlatformSource
        ? value
        : initiationReasonMetrc.find((item) => item.platformId === value)?.Name ?? value,
    }));
  };

  const handleResolveAll = async () => {
    setLoading(true);
    const unresolved = rows.filter((pkg) => !pkg.isApproved && !pkg.isRejected && toggleStates[pkg.packageId]);

    await Promise.all(
      unresolved.map(async (pkg) => {
        const isPlatformSource = pkg.advertisedPackageId?.includes("PKG");
        const initiationReason = packageReasons[pkg.packageId] || "";
        const initiationReasonReferenceId = !isPlatformSource
          ? initiationReasonMetrc.find((item) => item.Name === initiationReason)?.platformId
          : null;

        try {
          const res = await approvePackageAdjustment({
            shopId,
            id: pkg.id,
            initiationReason,
            initiationReasonReferenceId,
          });
          if (res?.data?.success) {
            toast.success(`Package ${pkg.packageId} resolved successfully.`);
            setRows((prev) =>
              prev.map((item) => (item.packageId === pkg.packageId ? { ...item, isApproved: true } : item))
            );
          }
        } catch (err: any) {
          setErrors((prev) => ({ ...prev, [pkg.packageId]: err?.message || "Failed to resolve package" }));
        }
      })
    );
    setLoading(false);
  };

  const handleViewActivity = async (record: any) => {
    try {
      const res = await fetchPackageAdjustment(record.id, shopId);
      const filtered = (res?.data?.adjustment?.originSessionEvents ?? []).filter(
        (e: any) => e.packageId === record.packageId
      );
      setSelectedActivities(filtered);
      setActivityPopoverKey(record.key);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Package Id</TableHead>
            <TableHead>Package Name</TableHead>
            <TableHead className="text-center">Difference</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-center">Events</TableHead>
            <TableHead className="text-center">Include in Resolve All</TableHead>
            {Object.keys(errors).length > 0 && <TableHead>Error</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isPlatformSource = row.advertisedPackageId?.includes("PKG");
            const hasUnresolved = (selectedActivities ?? []).some(
              (e: any) => e.packageId === row.packageId && !e.isResolved
            );
            return (
              <TableRow key={row.key}>
                <TableCell className="font-mono text-xs">{row.advertisedPackageId}</TableCell>
                <TableCell>{row.packageNameSnapShot}</TableCell>
                <TableCell className="text-center">{row.totalDifferenceCount}</TableCell>
                <TableCell>
                  <Badge variant={row.isApproved ? "default" : "destructive"}>
                    {row.isApproved ? "Resolved" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isPlatformSource ? (
                    <Textarea
                      rows={2}
                      placeholder="Enter your text here"
                      value={packageReasons[row.packageId] || ""}
                      onChange={(e) => handleReasonChange(e.target.value, row.packageId, true)}
                    />
                  ) : (
                    <Select
                      value={packageReasons[row.packageId] ?? ""}
                      onValueChange={(v) => handleReasonChange(v, row.packageId, false)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {initiationReasonMetrc.map((item) => (
                          <SelectItem key={item.platformId} value={item.platformId}>
                            {item.Name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Popover
                    open={activityPopoverKey === row.key}
                    onOpenChange={(open) => !open && setActivityPopoverKey(null)}
                  >
                    <PopoverTrigger
                      render={
                        <Button size="sm" onClick={() => handleViewActivity(row)}>
                          {hasUnresolved && <AlertTriangle className="mr-1 size-3.5 text-red-500" />}
                          View Events
                        </Button>
                      }
                    />
                    <PopoverContent className="w-[36rem]">
                      <div className="mb-2 text-sm font-semibold">Activity Details</div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Note</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Operated By</TableHead>
                            <TableHead>Created At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedActivities.map((event: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell>{event.target}</TableCell>
                              <TableCell
                                className={
                                  event.operatedStockOnHold > 0
                                    ? "text-green-600"
                                    : event.operatedStockOnHold < 0
                                      ? "text-red-600"
                                      : ""
                                }
                              >
                                {event.operatedStockOnHold}
                              </TableCell>
                              <TableCell>
                                <Badge variant={event.isResolved ? "default" : "secondary"}>
                                  {event.isResolved ? "Resolved" : "Yet To Resolve"}
                                </Badge>
                              </TableCell>
                              <TableCell>{event.employeeName}</TableCell>
                              <TableCell>{new Date(event.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={toggleStates[row.packageId] ?? false}
                    onCheckedChange={() =>
                      setToggleStates((prev) => ({ ...prev, [row.packageId]: !prev[row.packageId] }))
                    }
                  />
                </TableCell>
                {Object.keys(errors).length > 0 && (
                  <TableCell>
                    {errors[row.packageId] && (
                      <span className="text-xs text-destructive">{errors[row.packageId]}</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={loading || rows.every((pkg) => pkg.isApproved)} onClick={handleResolveAll}>
          {loading ? "Resolving..." : "Resolve All"}
        </Button>
      </div>
    </div>
  );
}
