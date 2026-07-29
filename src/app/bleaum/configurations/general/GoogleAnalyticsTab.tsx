"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getAnalyticsConfig } from "@/services/googleAnalytics/getAnalyticsConfig";
import { updateAnalyticsConfig } from "@/services/googleAnalytics/updateAnalyticsConfig";
import { deleteAnalyticsConfig } from "@/services/googleAnalytics/deleteAnalyticsConfig";

export default function GoogleAnalyticsTab() {
  const [analyticsId, setAnalyticsId] = useState("");
  const [analyticsIdNumber, setAnalyticsIdNumber] = useState("");
  const [hasConfig, setHasConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await getAnalyticsConfig();
      const config = res?.data?.data?.googleAnalyticsConfig;
      if (config) {
        setAnalyticsId(config.analyticsId || "");
        setAnalyticsIdNumber(config.analyticsIdNumber || "");
        setHasConfig(true);
      } else {
        setHasConfig(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch analytics configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analyticsId || !analyticsIdNumber) {
      toast.error("Please fill in both Google Analytics fields");
      return;
    }
    setSaving(true);
    try {
      await updateAnalyticsConfig({ analyticsId, analyticsIdNumber });
      toast.success(hasConfig ? "Analytics configuration updated successfully" : "Analytics configuration saved successfully");
      fetchConfig();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save analytics configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteAnalyticsConfig();
      toast.success("Analytics configuration deleted successfully");
      setAnalyticsId("");
      setAnalyticsIdNumber("");
      setHasConfig(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete analytics configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 text-muted-foreground">Google Analytics ID</Label>
            <Input value={analyticsId} onChange={(e) => setAnalyticsId(e.target.value)} placeholder="Enter Google Analytics ID" />
          </div>
          <div>
            <Label className="mb-2 text-muted-foreground">Google Analytics ID Number</Label>
            <Input
              value={analyticsIdNumber}
              onChange={(e) => setAnalyticsIdNumber(e.target.value)}
              placeholder="UA-12345-6 or G-XXXXXXXX"
              maxLength={20}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {hasConfig && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              Delete Configuration
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : hasConfig ? "Update" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
