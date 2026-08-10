"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { fetchMetrcCredentials } from "@/services/metrcConfig/getCredentials";
import { upsertMetrcCredentials } from "@/services/metrcConfig/upsertCredentials";
import { deleteMetrcCredentials } from "@/services/metrcConfig/deleteCredentials";
import { fetchAvailableMetrcLocations } from "@/services/metrcConfig/getLocations";
import { refreshAvailableMetrcLocations } from "@/services/metrcConfig/refreshLocations";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Field } from "@/components/admin/form-fields";
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

type TemplateType = "metrcTag" | "metrcId" | "metrcTagLast10" | "other";

const TEMPLATE_BY_TYPE: Record<Exclude<TemplateType, "other">, string> = {
  metrcTag: "{{metrcTag}}",
  metrcId: "{{metrcId}}",
  metrcTagLast10: "{{last10DMetrcTag}}",
};

function templateTypeFor(template: string): TemplateType {
  const found = (Object.keys(TEMPLATE_BY_TYPE) as (keyof typeof TEMPLATE_BY_TYPE)[]).find(
    (key) => TEMPLATE_BY_TYPE[key] === template
  );
  return found ?? "other";
}

interface MetrcLocation {
  Id: string | number;
  Name: string;
}

export default function MetrcConfigurationPage() {
  const { shopId } = useShop();
  const metrcMechanism = useFeatureAccess();
  const isCaliforniaState = typeof window !== "undefined" && localStorage.getItem("isCaliforniaState") === "true";

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const [license, setLicense] = useState("");
  const [userApiKey, setUserApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [isAutoSaleReportEnabled, setIsAutoSaleReportEnabled] = useState(false);
  const [shouldSyncProducts, setShouldSyncProducts] = useState(false);
  const [templateType, setTemplateType] = useState<TemplateType>("metrcTag");
  const [template, setTemplate] = useState("{{metrcTag}}");

  const [locations, setLocations] = useState<MetrcLocation[]>([]);
  const [refreshingLocations, setRefreshingLocations] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [patientRegLocationName, setPatientRegLocationName] = useState<string | null>(null);
  const [patientRegLocationId, setPatientRegLocationId] = useState<string | number | null>(null);

  const metrcLocation =
    metrcMechanism === "METRC_OK" ? "oklahoma" : metrcMechanism === "METRC_CALI" ? "california" : "michigan";

  const loadConfiguration = async () => {
    if (!shopId) return;
    const res = await fetchMetrcCredentials(shopId as string);
    const credentials = res?.data?.data?.credentials;
    if (!credentials) return;

    const tmpl = credentials.advertisedPackageIdTemplate || "{{metrcTag}}";
    setLicense(credentials.license ?? "");
    setUserApiKey(credentials.userApiKey ?? "");
    setEnabled(!!credentials.enabled);
    setIsAutoSaleReportEnabled(!!credentials.isAutoSaleReportEnabled);
    setShouldSyncProducts(!!credentials.shouldSyncProducts);
    setConfigId(credentials.id ?? null);
    setTemplate(tmpl);
    setTemplateType(templateTypeFor(tmpl));
    setPatientRegLocationName(credentials.patientRegistrationLocationName ?? null);
    setPatientRegLocationId(credentials.patientRegistrationLocationId ?? null);
  };

  useEffect(() => {
    loadConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    fetchAvailableMetrcLocations(shopId as string).then((res) => setLocations(res?.data ?? []));
  }, [shopId]);

  const handleRefreshLocations = async () => {
    if (!shopId) return;
    setRefreshingLocations(true);
    try {
      const res = await refreshAvailableMetrcLocations(shopId as string);
      setLocations(res?.data ?? []);
      toast.success("METRC locations refreshed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to refresh METRC locations");
    } finally {
      setRefreshingLocations(false);
    }
  };

  const handleSave = async () => {
    if (!shopId) return;
    if (!userApiKey.trim()) {
      toast.error("API key is required");
      return;
    }
    if (!license.trim()) {
      toast.error("License is required");
      return;
    }

    setLoading(true);
    try {
      await upsertMetrcCredentials({
        shopId,
        license,
        userApiKey,
        metrcLocation,
        enabled,
        isAutoSaleReportEnabled,
        shouldSyncProducts,
        advertisedPackageIdTemplate: template,
        patientRegistrationLocationName: patientRegLocationName,
        patientRegistrationLocationId: patientRegLocationId,
      });
      toast.success("Configuration saved successfully");
      await loadConfiguration();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shopId || !configId) return;
    setDeleteLoading(true);
    try {
      await deleteMetrcCredentials(shopId as string);
      toast.success("Configuration deleted successfully");
      setConfigId(null);
      setLicense("");
      setUserApiKey("");
      setEnabled(false);
      setIsAutoSaleReportEnabled(false);
      setShouldSyncProducts(false);
      setTemplate("{{metrcTag}}");
      setTemplateType("metrcTag");
      setPatientRegLocationName(null);
      setPatientRegLocationId(null);
    } catch {
      toast.error("Failed to delete configuration");
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>METRC</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>METRC Configuration</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="w-full p-5">
        <div className="flex flex-col gap-4">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Configuration</div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Location">
              <Select value={metrcLocation} disabled>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="california">California</SelectItem>
                  <SelectItem value="oklahoma">Oklahoma</SelectItem>
                  <SelectItem value="michigan">Michigan</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="API Key" required>
              <Input value={userApiKey} onChange={(e) => setUserApiKey(e.target.value)} placeholder="Enter API Key" />
            </Field>

            <Field label="License" required>
              <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Enter License" />
            </Field>

            <Field label="Package ID Template Type" required>
              <Select
                value={templateType}
                onValueChange={(value) => {
                  const next = value as TemplateType;
                  setTemplateType(next);
                  setTemplate(next === "other" ? "{{metrcTag}}{{metrcId}}" : TEMPLATE_BY_TYPE[next]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metrcTag">METRC TAG</SelectItem>
                  <SelectItem value="metrcId">METRC ID</SelectItem>
                  <SelectItem value="metrcTagLast10">METRC TAG (Last 10 Digits)</SelectItem>
                  <SelectItem value="other">CUSTOM</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {templateType === "other" && (
              <Field label="Custom Template" required>
                <Input value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="e.g. {{metrcTag}}{{metrcId}}" />
              </Field>
            )}
          </div>

          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Settings</div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 bg-muted/30 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Configuration Status</span>
              <span className="text-xs text-muted-foreground">
                {enabled ? "Configuration is active" : "Configuration is inactive"}
              </span>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 bg-muted/30 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Auto Sale Report</span>
              <span className="text-xs text-muted-foreground">Automatically generate and submit sale reports</span>
            </div>
            <Switch checked={isAutoSaleReportEnabled} onCheckedChange={setIsAutoSaleReportEnabled} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 bg-muted/30 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Sync METRC Items</span>
              <span className="text-xs text-muted-foreground">
                Automatically import METRC categories &amp; products associated with packages
              </span>
            </div>
            <Switch checked={shouldSyncProducts} onCheckedChange={setShouldSyncProducts} />
          </div>

          {isCaliforniaState && (
            <div className="rounded-lg border border-foreground/10">
              <button
                type="button"
                onClick={() => setShowMoreSettings((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                More Settings
                <ChevronDown className={`size-4 transition-transform ${showMoreSettings ? "rotate-180" : ""}`} />
              </button>

              {showMoreSettings && (
                <div className="flex flex-col gap-2 border-t border-foreground/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Patient Registration Location Preference</div>
                      <div className="text-xs text-muted-foreground">
                        Default METRC location used when registering patients
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={refreshingLocations}
                      onClick={handleRefreshLocations}
                      className="shrink-0"
                    >
                      {refreshingLocations ? "Refreshing..." : "Refresh Locations"}
                    </Button>
                  </div>

                  <Select
                    value={patientRegLocationId ? String(patientRegLocationId) : "__none__"}
                    onValueChange={(v) => {
                      if (v === "__none__") {
                        setPatientRegLocationName(null);
                        setPatientRegLocationId(null);
                        return;
                      }
                      const loc = locations.find((l) => String(l.Id) === v);
                      setPatientRegLocationName(loc?.Name ?? null);
                      setPatientRegLocationId(loc?.Id ?? null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select METRC Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select METRC Location</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.Id} value={String(l.Id)}>
                          {l.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-foreground/10 pt-4">
            {configId && (
              <Button variant="destructive" disabled={deleteLoading} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button disabled={loading} onClick={handleSave}>
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this configuration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteLoading} onClick={handleDelete}>
              {deleteLoading ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
