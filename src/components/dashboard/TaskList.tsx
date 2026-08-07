"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchTasksList } from "@/services/tasks/list";
import { fetchMyTasksList } from "@/services/tasks/listMyTasks";
import { fetchTaskStatuses } from "@/services/tasks/taskStatuses";
import { updateTaskStatus } from "@/services/tasks/updateTaskStatus";
import { useShop } from "@/context/shop-context";
import { useCurrentUser } from "@/util/use-current-user";
import { Button } from "@/components/ui/button";
import TaskItem from "./TaskItem";

const PAGE_SIZE = 5;

export default function TaskList() {
  const { shopId } = useShop();
  const currentUser = useCurrentUser();
  const [roleResolved, setRoleResolved] = useState(false);
  const [allTasks, setAllTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, current: 1 });

  const isAdmin = currentUser?.type === "SUPER_ADMIN";

  useEffect(() => {
    setRoleResolved(true);
  }, [currentUser]);

  const tasks = useMemo(() => {
    return allTasks.filter((task) => {
      const status = task.taskStatus?.displayName?.toLowerCase() || "";
      const isArchived = status === "completed" || status === "cancelled";
      return showArchived ? isArchived : !isArchived;
    });
  }, [allTasks, showArchived]);

  const fetchTasks = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const { data } = isAdmin ? await fetchTasksList(PAGE_SIZE, page) : await fetchMyTasksList(PAGE_SIZE, page);
        const allTasksData = data?.data?.tasks || [];
        setAllTasks(allTasksData);
        setPagination({ total: data?.data?.paginationData?.totalEntries || 0, current: page });
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!shopId || !roleResolved) return;
    (async () => {
      try {
        const { data } = await fetchTaskStatuses();
        setTaskStatuses(data?.taskPriorities || []);
      } catch (err) {
        console.error("Error fetching task statuses:", err);
      }
    })();
    fetchTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, roleResolved, isAdmin]);

  const handleStatusUpdate = async (taskId, statusId) => {
    await updateTaskStatus({ id: taskId, statusId, shopId });
    fetchTasks(pagination.current);
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / PAGE_SIZE));

  return (
    <div className="rounded-xl bg-component-bg shadow-md p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-normal text-text">Task List</h2>
        <div className="flex gap-2">
          <Button className="h-10 px-3.5 text-sm" variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Active Tasks" : "Archived"}
          </Button>
          <Button className="h-10 px-3.5 text-sm" onClick={() => fetchTasks(pagination.current)}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No tasks available</div>
        ) : (
          tasks.map((task, index) => (
            <TaskItem key={task.id || index} data={task} taskStatuses={taskStatuses} onStatusUpdate={handleStatusUpdate} />
          ))
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Link href="/settings/tasks-listings" className="text-sm font-medium text-primary hover:underline">
            See all
          </Link>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => fetchTasks(page)}
                className={`flex size-7 items-center justify-center rounded-md text-sm ${
                  page === pagination.current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-alt"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
