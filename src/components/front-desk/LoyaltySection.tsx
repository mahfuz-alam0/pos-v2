"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCustomerLoyaltyStatus } from "@/services/loyalty/getCustomerLoyaltyStatus";
import { getCustomerLoyaltyHistory } from "@/services/loyalty/getCustomerLoyaltyHistory";
import { blockCustomerLoyalty } from "@/services/loyalty/blockCustomerLoyalty";
import { unblockCustomerLoyalty } from "@/services/loyalty/unblockCustomerLoyalty";
import { updateCustomerLoyaltyPoints } from "@/services/loyalty/updateCustomerLoyaltyPoints";

export default function LoyaltySection({ customerId }) {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!customerId) return;
    setLoading(true);
    Promise.all([getCustomerLoyaltyStatus(customerId), getCustomerLoyaltyHistory(customerId)])
      .then(([statusRes, historyRes]) => {
        setStatus(statusRes?.data?.info || statusRes?.data?.data?.info || null);
        setHistory(historyRes?.data?.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [customerId]);

  const isBlocked = Boolean(status?.isBlocked);

  async function handleToggleBlock() {
    if (!reason.trim() && !isBlocked) {
      toast.error("Enter a reason to block this customer");
      return;
    }
    setSubmitting(true);
    try {
      if (isBlocked) {
        await unblockCustomerLoyalty(customerId);
        toast.success("Loyalty unblocked for this customer");
      } else {
        await blockCustomerLoyalty(customerId, reason);
        toast.success("Loyalty blocked for this customer");
      }
      setReason("");
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to update loyalty block status");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdatePoints() {
    const points = Number(pointsInput);
    if (!Number.isFinite(points) || points < 0) {
      toast.error("Enter a valid points value");
      return;
    }
    if (!reason.trim()) {
      toast.error("Enter a reason for this points adjustment");
      return;
    }
    setSubmitting(true);
    try {
      await updateCustomerLoyaltyPoints(customerId, points, reason);
      toast.success("Loyalty points updated");
      setPointsInput("");
      setReason("");
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to update points");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading loyalty info…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <div className="text-xs text-muted-foreground uppercase">Current Points</div>
          <div className="text-2xl font-semibold">{status?.currentPoints ?? 0}</div>
        </div>
        <Badge variant={isBlocked ? "destructive" : "default"}>{isBlocked ? "Blocked" : "Active"}</Badge>
      </div>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <div className="text-sm font-medium">Adjust</div>
        <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            placeholder="New points value"
            value={pointsInput}
            onChange={(e) => setPointsInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleUpdatePoints} disabled={submitting}>
            Update Points
          </Button>
        </div>
        <Button
          variant={isBlocked ? "default" : "destructive"}
          className="w-full"
          onClick={handleToggleBlock}
          disabled={submitting}
        >
          {isBlocked ? "Unblock Loyalty" : "Block Loyalty"}
        </Button>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">History</div>
        {history.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No loyalty history yet</div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {history.map((h, i) => (
              <div key={h.id || i} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div>{h.reason || h.description || "Points adjustment"}</div>
                  <div className="text-xs text-muted-foreground">
                    {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                  </div>
                </div>
                <span className="font-semibold">{h.points > 0 ? `+${h.points}` : h.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
