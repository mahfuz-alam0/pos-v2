"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, RotateCw, X } from "lucide-react";

import { fetchTasksList } from "@/services/tasks/list";
import { fetchMyTasksList } from "@/services/tasks/listMyTasks";
import { fetchTaskStatuses } from "@/services/tasks/taskStatuses";
import { updateTaskStatus } from "@/services/tasks/updateTaskStatus";
import { getCurrentUser } from "@/util/use-current-user";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { TablePagination } from "@/components/ui/table-pagination";

import TaskItem from "./TaskItem";
import TaskDetailsPanel from "./TaskDetailsPanel";
import AddTaskDrawer from "./AddTaskDrawer";

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

interface TaskStatus {
  statusId: string;
  priorityId: string;
  displayName: string;
  colorCode?: string;
}

const PAGE_SIZE = 20;

export default function TasksListingPage() {
  const [isAdmin] = useState(() => getCurrentUser()?.type === "SUPER_ADMIN");

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageSize: PAGE_SIZE, total: 0, current: 1 });

  const tasks = useMemo(() => {
    return allTasks.filter((task) => {
      const status = task.taskStatus?.displayName?.toLowerCase() || "";
      const isArchived = status === "completed" || status === "cancelled";
      return showArchived ? isArchived : !isArchived;
    });
  }, [allTasks, showArchived]);

  const fetchTaskStatusesList = async () => {
    try {
      const { data } = await fetchTaskStatuses();
      setTaskStatuses(data?.taskPriorities || []);
    } catch {
      // status list is non-critical; dropdown just renders empty
    }
  };

  const fetchDataAsync = async (page: number) => {
    setLoading(true);
    try {
      const result = isAdmin ? await fetchTasksList(PAGE_SIZE, page) : await fetchMyTasksList(PAGE_SIZE, page);
      setAllTasks(result?.data?.data?.tasks || []);
      setPagination((prev) => ({ ...prev, total: result?.data?.data?.paginationData?.totalEntries ?? 0, current: page }));
    } catch {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskStatusesList();
    fetchDataAsync(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusUpdate = async (taskId: string, statusId: string) => {
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      await updateTaskStatus({ id: taskId, statusId, shopId });
      toast.success("Task status updated successfully");
      fetchDataAsync(pagination.current);
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const handleAddTaskSuccess = () => {
    setAddTaskOpen(false);
    fetchDataAsync(pagination.current);
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));

  return (
    <div className="flex flex-col gap-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Tasks</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex gap-6">
        <Card className={`flex-1 gap-4 p-4 ${selectedTask ? "max-w-[65%]" : ""}`}>
          <div className="flex items-center justify-end gap-2">
            <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Active Tasks" : "Archived"}
            </Button>
            <Button variant="outline" onClick={() => fetchDataAsync(pagination.current)} disabled={loading}>
              <RotateCw className={loading ? "size-4 animate-spin" : "size-4"} /> Refresh
            </Button>
            <Button onClick={() => setAddTaskOpen(true)}>
              <Plus className="size-4" /> Add Task
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No tasks available</div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  data={task}
                  taskStatuses={taskStatuses}
                  onStatusUpdate={handleStatusUpdate}
                  onTaskClick={setSelectedTask}
                />
              ))
            )}
          </div>

          {tasks.length > 0 && (
            <TablePagination
              page={pagination.current}
              totalPages={totalPages}
              totalEntries={pagination.total}
              pageSize={pagination.pageSize}
              loading={loading}
              onPageChange={fetchDataAsync}
            />
          )}
        </Card>

        {selectedTask && (
          <div className="w-[35%] shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold">Task Details</h2>
              <Button variant="outline" size="icon-sm" onClick={() => setSelectedTask(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <TaskDetailsPanel selectedTask={selectedTask} />
          </div>
        )}
      </div>

      <AddTaskDrawer open={addTaskOpen} onClose={() => setAddTaskOpen(false)} onSaved={handleAddTaskSuccess} />
    </div>
  );
}
