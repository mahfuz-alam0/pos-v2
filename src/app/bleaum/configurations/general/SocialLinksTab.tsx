"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Link as LinkIcon, PlusCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { BusinessEntitySelect } from "./BusinessEntitySelect";
import { getSocialLinks } from "@/services/socialLinks/getSocialLinks";
import { updateSocialLinks } from "@/services/socialLinks/updateSocialLinks";

const PLATFORMS = [
  { type: "TWITTER", label: "Twitter" },
  { type: "FACEBOOK", label: "Facebook" },
  { type: "LINKEDIN", label: "LinkedIn" },
  { type: "INSTAGRAM", label: "Instagram" },
  { type: "WEB", label: "Web" },
  { type: "YOUTUBE", label: "YouTube" },
  { type: "TWITCH", label: "Twitch" },
] as const;

type PlatformType = (typeof PLATFORMS)[number]["type"];

interface Link {
  type: PlatformType;
  url: string;
}

function platformMeta(type: string) {
  return PLATFORMS.find((p) => p.type === type) ?? PLATFORMS[4];
}

export default function SocialLinksTab() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entityId, setEntityId] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks(entityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const fetchLinks = async (businessEntityId: string | null) => {
    setLoading(true);
    try {
      const res = await getSocialLinks(businessEntityId);
      setLinks(res?.data?.data?.socialLinks || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch social links");
    } finally {
      setLoading(false);
    }
  };

  const usedTypes = links.map((l) => l.type);
  const availablePlatforms = PLATFORMS.filter((p) => !usedTypes.includes(p.type));

  const handleAdd = () => {
    const next = availablePlatforms[0];
    if (next) setLinks((prev) => [...prev, { type: next.type, url: "" }]);
  };

  const handleRemove = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, url: string) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, url } : l)));
  };

  const handleTypeChange = (index: number, type: PlatformType) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, type } : l)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: { links: Link[]; businessEntityId?: string } = { links };
      if (entityId) payload.businessEntityId = entityId;
      await updateSocialLinks(payload);
      toast.success("Social links updated successfully");
      fetchLinks(entityId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update social links");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex items-center justify-between border-b pb-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-primary uppercase">Social Links</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {links.length} platform{links.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <BusinessEntitySelect value={entityId} onChange={setEntityId} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No social links added yet. Click &quot;Add Platform&quot; to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {links.map((link, index) => {
              const meta = platformMeta(link.type);
              const Icon = meta.type === "WEB" ? Globe : LinkIcon;
              return (
                <div key={`${link.type}-${index}`} className="relative rounded-lg bg-muted p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                      <Icon className="size-3.5" />
                      {meta.label}
                    </div>
                    <button type="button" onClick={() => handleRemove(index)} className="text-destructive">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      items={PLATFORMS.map((p) => ({ value: p.type, label: p.label }))}
                      value={link.type}
                      onValueChange={(v) => handleTypeChange(index, v as PlatformType)}
                    >
                      <SelectTrigger className="w-32 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.type} value={p.type}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Enter URL" value={link.url} onChange={(e) => handleUrlChange(index, e.target.value)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleAdd} disabled={availablePlatforms.length === 0}>
            <PlusCircle className="size-4" />
            Add Platform
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
