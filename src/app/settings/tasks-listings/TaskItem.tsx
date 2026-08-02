"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Info, User } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskStatus {
  statusId: string;
  priorityId: string;
  displayName: string;
  colorCode?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  tags?: { name: string; colorCode?: string }[];
  assignedTo?: { name: string } | { name: string }[];
  createdAt: string;
  taskPriority?: { displayName: string; colorCode?: string };
  taskStatus?: { statusId: string; displayName: string; colorCode?: string };
  dueDateString?: string;
}

export default function TaskItem({
  data,
  taskStatuses,
  onStatusUpdate,
  onTaskClick,
}: {
  data: Task;
  taskStatuses: TaskStatus[];
  onStatusUpdate: (taskId: string, statusId: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
}) {
  const { id, title, description, tags, assignedTo, createdAt, taskPriority, taskStatus, dueDateString } = data;
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (statusId: string) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(id, statusId);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-slot=select-trigger]") || target.closest("a") || target.closest("button")) return;
    onTaskClick(data);
  };

  const assignees = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
  const isOverdue = dueDateString ? new Date(dueDateString) < new Date() : false;

  return (
    <div
      onClick={handleCardClick}
      className="grid cursor-pointer grid-cols-1 items-center gap-3 rounded-lg p-3 ring-1 ring-foreground/10 transition-all hover:-translate-y-px hover:ring-foreground/20 lg:grid-cols-[1fr_auto]"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{title}</span>
        {description && (
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-3.5 shrink-0 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Click to view details</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={taskStatuses.map((s) => ({ value: s.priorityId, label: s.displayName }))}
          value={taskStatus?.statusId}
          onValueChange={(v) => handleStatusChange(v as string)}
        >
          <SelectTrigger size="sm" className="w-32" disabled={isUpdating}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {taskStatuses.map((status) => (
              <SelectItem key={status.statusId} value={status.priorityId}>
                <span className="size-2 rounded-full" style={{ backgroundColor: status.colorCode || "#94a3b8" }} />
                {status.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {taskPriority && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap text-white uppercase"
            style={{ backgroundColor: taskPriority.colorCode || "#64748b" }}
          >
            {taskPriority.displayName}
          </span>
        )}

        {assignees.length > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
                <User className="size-3" />
                {assignees.length === 1 ? (
                  <span className="max-w-[100px] truncate">{assignees[0].name}</span>
                ) : (
                  <span>{assignees.length} assignees</span>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>{assignees.map((a) => a.name).join(", ")}</TooltipContent>
          </Tooltip>
        )}

        <span className="flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
          <CalendarDays className="size-3" />
          {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
        </span>

        {dueDateString && (
          <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
            <CheckCircle2 className="size-3" />
            Due: {new Date(dueDateString).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
          </span>
        )}

        {tags && tags.length > 0 && (
          <div className="flex items-center gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <Tooltip key={index}>
                <TooltipTrigger>
                  <span className="block size-2 rounded-full" style={{ backgroundColor: tag.colorCode || "#94a3b8" }} />
                </TooltipTrigger>
                <TooltipContent>{tag.name}</TooltipContent>
              </Tooltip>
            ))}
            {tags.length > 3 && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
                </TooltipTrigger>
                <TooltipContent>{tags.slice(3).map((t) => t.name).join(", ")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
