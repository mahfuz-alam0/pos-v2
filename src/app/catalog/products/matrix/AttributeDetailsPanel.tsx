"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { fetchSingleMatrixAttribute } from "@/services/matrixAttributes/getSingle";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { AttributeRow } from "./types";

export default function AttributeDetailsPanel({
  attributeId,
  onClose,
  onEdit,
}: {
  attributeId: string | number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [attribute, setAttribute] = useState<AttributeRow | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSingleMatrixAttribute(attributeId);
      setAttribute(res?.data ?? null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load attribute");
    } finally {
      setLoading(false);
    }
  }, [attributeId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Attribute Details</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : attribute ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Name:</span>
                <span className="flex-1 text-sm font-medium">{attribute.name ?? "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Created At:</span>
                <span className="flex-1 text-sm">
                  {attribute.createdAt ? new Date(attribute.createdAt).toLocaleDateString() : "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Type:</span>
                <span className="flex-1 text-sm">{attribute.type ?? "-"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Description:</span>
                <span className="flex-1 text-sm">{attribute.details ?? "-"}</span>
              </div>

              <div className="mt-2 flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Values:</span>
                {attribute.values && attribute.values.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {attribute.values.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-foreground/10"
                      >
                        <span className="text-sm">{v.value}</span>
                        {v.valueRepresentation && (
                          <span
                            className="size-4 shrink-0 rounded-full ring-1 ring-foreground/10"
                            style={{ backgroundColor: v.valueRepresentation }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm">-</span>
                )}
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">Attribute not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
