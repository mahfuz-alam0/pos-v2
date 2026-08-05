"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Link2, PlusCircle, MessageCircle, ThumbsUp, Briefcase, Camera, PlayCircle, Video, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { BusinessEntitySelect } from "./BusinessEntitySelect";
import { getSocialLinks } from "@/services/socialLinks/getSocialLinks";
import { updateSocialLinks } from "@/services/socialLinks/updateSocialLinks";

const PLATFORMS = [
  { type: "TWITTER", label: "Twitter", icon: MessageCircle, color: "text-sky-500 bg-sky-500/10" },
  { type: "FACEBOOK", label: "Facebook", icon: ThumbsUp, color: "text-blue-600 bg-blue-600/10" },
  { type: "LINKEDIN", label: "LinkedIn", icon: Briefcase, color: "text-blue-700 bg-blue-700/10" },
  { type: "INSTAGRAM", label: "Instagram", icon: Camera, color: "text-pink-600 bg-pink-600/10" },
  { type: "WEB", label: "Web", icon: Globe, color: "text-emerald-600 bg-emerald-600/10" },
  { type: "YOUTUBE", label: "YouTube", icon: PlayCircle, color: "text-red-600 bg-red-600/10" },
  { type: "TWITCH", label: "Twitch", icon: Video, color: "text-purple-600 bg-purple-600/10" },
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Share2 className="size-4.5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Social Links</div>
              <p className="text-xs text-muted-foreground">
                {links.length} platform{links.length !== 1 ? "s" : ""} configured
              </p>
            </div>
          </div>
          <BusinessEntitySelect value={entityId} onChange={setEntityId} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-17 w-full rounded-xl" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/40 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Link2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">No social links yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Add a platform to start linking your profiles.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleAdd} className="mt-1">
              <PlusCircle className="size-4" />
              Add Platform
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {links.map((link, index) => {
              const meta = platformMeta(link.type);
              const Icon = meta.icon;
              return (
                <div
                  key={`${link.type}-${index}`}
                  className="group relative flex items-center gap-3 rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/70"
                >
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", meta.color)}>
                    <Icon className="size-4.5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Select
                      items={PLATFORMS.map((p) => ({ value: p.type, label: p.label }))}
                      value={link.type}
                      onValueChange={(v) => handleTypeChange(index, v as PlatformType)}
                    >
                      <SelectTrigger size="sm" className="h-6 w-fit gap-1 border-none bg-transparent p-0 text-xs font-semibold text-foreground shadow-none hover:bg-transparent">
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
                    <Input
                      placeholder="Enter URL"
                      value={link.url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      className="h-7 border-none bg-transparent px-0 text-sm shadow-none focus-visible:shadow-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remove ${meta.label}`}
                    className="shrink-0 self-start rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 pt-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
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
