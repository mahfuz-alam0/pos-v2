"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, CheckCircle2, Loader2, Play, User } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { startAssignedAuditSession } from "@/services/assignedAuditSessions/start";
import { Button } from "@/components/ui/button";

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export default function TaskItem({ data, taskStatuses, onStatusUpdate }) {
  const { id, title, description, tags, assignedTo, createdAt, taskPriority, taskStatus, dueDateString, domain } = data;
  const router = useRouter();
  const { shopId } = useShop();
  const [isUpdating, setIsUpdating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(taskStatus?.statusId);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await startAssignedAuditSession(shopId, { taskId: id });
      const auditSessionId = res?.data?.data?.auditSessionId;
      toast.success("Count session started");
      if (auditSessionId) router.push(`/inventory-management/audit/${auditSessionId}`);
    } catch (err) {
      toast.error(err?.message || "Failed to start count session");
    } finally {
      setStarting(false);
    }
  };

  const handleStatusChange = async (e) => {
    const statusId = e.target.value;
    const selectedStatus = taskStatuses?.find((s) => s.statusId === statusId);
    const statusName = selectedStatus?.displayName?.toLowerCase() || "";

    if (statusName === "cancelled" && !confirm("Are you sure you want to cancel this task?")) {
      return;
    }

    setCurrentStatus(statusId);
    setIsUpdating(true);
    try {
      await onStatusUpdate(id, statusId);
    } catch {
      setCurrentStatus(taskStatus?.statusId);
    } finally {
      setIsUpdating(false);
    }
  };

  const assignees = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
  const assigneeLabel =
    assignees.length === 0 ? null : assignees.length === 1 ? assignees[0].name : `${assignees.length} assignees`;

  const isOverdue = dueDateString && new Date(dueDateString) < new Date();

  return (
    <div className="rounded-lg border border-border bg-component-bg p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md">
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <Link href="/settings/tasks-listings" className="truncate text-sm font-medium text-text hover:text-primary" title={description || undefined}>
            {title}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {domain === "COUNT_SESSION" && taskStatus?.statusId === "pending" && (
            <Button size="sm" onClick={handleStart} disabled={starting}>
              {starting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Start
            </Button>
          )}

          <select
            value={currentStatus}
            onChange={handleStatusChange}
            disabled={isUpdating}
            className="h-7 rounded-md border border-border bg-component-bg px-2 text-xs"
          >
            {taskStatuses?.map((status) => (
              <option key={status.statusId} value={status.statusId}>
                {status.displayName}
              </option>
            ))}
          </select>

          {taskPriority && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase"
              style={{ backgroundColor: taskPriority.colorCode || "#64748b" }}
            >
              {taskPriority.displayName}
            </span>
          )}

          {assigneeLabel && (
            <span className="flex items-center gap-1 rounded-md bg-surface-alt px-2 py-1 text-xs font-medium text-text">
              <User className="size-3" />
              <span className="max-w-25 truncate">{assigneeLabel}</span>
            </span>
          )}

          <span className="flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
            <Calendar className="size-3" />
            {formatShortDate(createdAt)}
          </span>

          {dueDateString && (
            <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${isOverdue ? "font-medium text-red-500" : "text-muted-foreground"}`}>
              <CheckCircle2 className="size-3" />
              Due: {formatShortDate(dueDateString)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
