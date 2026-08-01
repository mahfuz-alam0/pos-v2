"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchPackagesList } from "@/services/packages/list";
import { listStorageLocations } from "@/services/storageLocations/listStorageLocations";
import { activatePackage } from "@/services/packages/activate";
import { deactivatePackage } from "@/services/packages/deactivate";
import { continuePackage } from "@/services/packages/continue";
import { discontinuePackage } from "@/services/packages/discontinue";
import { detachPackage } from "@/services/packages/detach";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PrintLabelModal from "@/components/pos/PrintLabelModal";
import PackageActivityDrawer from "../packages/PackageActivityDrawer";
import AddEditProductDrawer from "@/app/catalog/products/AddEditProductDrawer";

function isMetrcPackage(pkg: any) {
  return pkg.source !== "PLATFORM";
}

function PackageCard({
  pkg,
  locations,
  shopId,
  onChanged,
  onReconcile,
}: {
  pkg: any;
  locations: Record<string, string>;
  shopId: string;
  onChanged: () => void;
  onReconcile?: (pkg: any) => void;
}) {
  const [toggleLoading, setToggleLoading] = useState(false);
  const [detaching, setDetaching] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [syncWithMetrc, setSyncWithMetrc] = useState(false);

  const isMetrc = isMetrcPackage(pkg);

  const handleToggleActive = async () => {
    setToggleLoading(true);
    try {
      if (pkg.isActive) {
        await deactivatePackage(pkg.id, shopId, isMetrc);
        toast.success(`Package ${pkg.id} deactivated successfully`);
      } else {
        await activatePackage(pkg.id, shopId, isMetrc);
        toast.success(`Package ${pkg.id} activated successfully`);
      }
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update package activation");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleFinish = async () => {
    setFinishLoading(true);
    try {
      const res: any = await discontinuePackage(pkg.id, shopId, isMetrc, isMetrc ? syncWithMetrc : undefined);
      toast.success("Package Successfully Finished");
      const silentErrors = res?.data?.data?.silentErrors;
      silentErrors?.forEach((msg: string) => toast.warning(msg));
      setFinishOpen(false);
      setSyncWithMetrc(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to finish package");
    } finally {
      setFinishLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    try {
      const res: any = await continuePackage(pkg.id, shopId, isMetrc, isMetrc ? syncWithMetrc : undefined);
      toast.success("Package Successfully Restored");
      const silentErrors = res?.data?.data?.silentErrors;
      silentErrors?.forEach((msg: string) => toast.warning(msg));
      setRestoreOpen(false);
      setSyncWithMetrc(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore package");
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleDetach = async () => {
    setDetaching(true);
    try {
      await detachPackage(pkg.id, shopId, isMetrc);
      toast.success("Package detached successfully");
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to detach package");
    } finally {
      setDetaching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {pkg.advertisedId}
          <Badge variant="outline">{pkg.source}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{pkg.productName}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap justify-between gap-4 border-b border-border pb-2 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{pkg.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Quantity:</p>
            <p className="font-medium">
              {pkg.quantityLeft} {pkg.uoMShortForm}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Unit Cost:</p>
            <p className="font-medium">${pkg.unitCost || "0.00"}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 font-semibold">Storage Location Breakdown</p>
          {pkg.storageLocationBreakdown && Object.keys(pkg.storageLocationBreakdown).length > 0 ? (
            <div className="flex flex-col gap-2">
              {Object.entries(pkg.storageLocationBreakdown).map(([locationId, quantity]) => (
                <div key={locationId} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">{locations[locationId] || locationId}</span>
                  <span className="font-semibold">
                    {String(quantity)} {pkg.uoMShortForm}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This package has no storage location data.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {!pkg.isMarkedAsFinished && (
              <Button size="sm" onClick={handleToggleActive} disabled={toggleLoading}>
                {pkg.isActive ? "Deactivate" : "Activate"}
              </Button>
            )}
            {!pkg.isMarkedAsFinished ? (
              <Button size="sm" onClick={() => setFinishOpen(true)}>
                Finish
              </Button>
            ) : (
              <Button size="sm" onClick={() => setRestoreOpen(true)}>
                Restore
              </Button>
            )}
            <Button size="sm" onClick={() => setPrintOpen(true)}>
              Print
            </Button>
            {onReconcile && (
              <Button size="sm" onClick={() => onReconcile(pkg)}>
                Reconcile
              </Button>
            )}
            <Button size="sm" onClick={() => setActivityOpen(true)}>
              Activity
            </Button>
            {pkg.productId && pkg.inventoryId && (
              <Button size="sm" variant="destructive" onClick={handleDetach} disabled={detaching}>
                Detach
              </Button>
            )}
          </div>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        </div>
      </CardContent>

      <PrintLabelModal open={printOpen} onClose={() => setPrintOpen(false)} packageId={pkg.id} shopId={shopId} />

      <PackageActivityDrawer open={activityOpen} packageId={pkg.id} onClose={() => setActivityOpen(false)} />

      {pkg.productId && (
        <AddEditProductDrawer
          open={editOpen}
          product={{ id: pkg.productId } as any}
          onClose={() => setEditOpen(false)}
          onDone={() => {
            setEditOpen(false);
            onChanged();
          }}
        />
      )}

      <AlertDialog open={finishOpen} onOpenChange={(open) => !open && !finishLoading && setFinishOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this package as finished? This will make it inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!!pkg?.metrcData && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Report to METRC</p>
                <p className="text-xs text-muted-foreground">Also finish this package in METRC</p>
              </div>
              <Switch checked={syncWithMetrc} onCheckedChange={setSyncWithMetrc} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finishLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinish} disabled={finishLoading}>
              {finishLoading ? "Finishing..." : "Yes, Finish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreOpen} onOpenChange={(open) => !open && !restoreLoading && setRestoreOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this package? It will become active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!!pkg?.metrcData && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Report to METRC</p>
                <p className="text-xs text-muted-foreground">Also restore this package in METRC</p>
              </div>
              <Switch checked={syncWithMetrc} onCheckedChange={setSyncWithMetrc} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoreLoading}>
              {restoreLoading ? "Restoring..." : "Yes, Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function PackageStorageLocations({
  productId,
  shopId,
  onReconcile,
}: {
  productId: string;
  shopId: string;
  onReconcile?: (pkg: any) => void;
}) {
  const [activeTab, setActiveTab] = useState("unfinished");
  const [packages, setPackages] = useState<any[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadPackages = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetchPackagesList(shopId, {
        limit: 30,
        page: 1,
        isFinished: activeTab === "finished",
        productId,
      });
      setPackages(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, activeTab]);

  useEffect(() => {
    if (!shopId) return;
    listStorageLocations([]).then((res: any) => {
      const map: Record<string, string> = {};
      (res?.data?.data?.locations ?? []).forEach((loc: any) => {
        map[loc.id] = loc.name;
      });
      setLocations(map);
    });
  }, [shopId]);

  const content = loading ? (
    <div className="flex items-center justify-center py-10 text-muted-foreground">Loading...</div>
  ) : packages.length > 0 ? (
    <div className="flex flex-col gap-4 py-3">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          locations={locations}
          shopId={shopId}
          onChanged={loadPackages}
          onReconcile={onReconcile}
        />
      ))}
    </div>
  ) : (
    <p className="py-6 text-center text-sm text-muted-foreground">No packages found for this product.</p>
  );

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
      <TabsList>
        <TabsTrigger value="unfinished">Unfinished Packages</TabsTrigger>
        <TabsTrigger value="finished">Finished Packages</TabsTrigger>
      </TabsList>
      <TabsContent value="unfinished">{content}</TabsContent>
      <TabsContent value="finished">{content}</TabsContent>
    </Tabs>
  );
}
