"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchTasksList } from "@/services/tasks/list";
import { fetchMyTasksList } from "@/services/tasks/listMyTasks";
import { fetchTaskStatuses } from "@/services/tasks/taskStatuses";
import { updateTaskStatus } from "@/services/tasks/updateTaskStatus";
import { useShop } from "@/context/shop-context";
import { usePermission } from "@/util/use-permission";
import { Button } from "@/components/ui/button";
import TaskItem from "./TaskItem";

const LIMIT = 5;

export default function TaskList() {
  const { shopId } = useShop();
  const { hasRole } = usePermission();
  const canViewOthers = hasRole("BOTH");
  const [activeTab, setActiveTab] = useState("mine");
  const [allTasks, setAllTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTasks = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const { data } =
          activeTab === "others" && canViewOthers
            ? await fetchTasksList(LIMIT, page)
            : await fetchMyTasksList(LIMIT, page);
        setAllTasks(data?.data?.tasks || []);
        setTotalPages(Math.max(1, data?.data?.paginationData?.totalPages || 1));
        setCurrentPage(page);
      } catch (err) {
        console.error("Error fetching tasks:", err?.message || err);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, canViewOthers]
  );

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      try {
        const { data } = await fetchTaskStatuses();
        setTaskStatuses(data?.taskPriorities || []);
      } catch (err) {
        console.error("Error fetching task statuses:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    fetchTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, activeTab, canViewOthers]);

  const handleStatusUpdate = async (taskId, statusId) => {
    await updateTaskStatus({ id: taskId, statusId, shopId });
    fetchTasks(currentPage);
  };

  return (
    <div className="rounded-xl bg-component-bg shadow-md p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-normal text-text">Task List</h2>
        <Button className="h-10 px-3.5 text-sm" onClick={() => fetchTasks(currentPage)}>
          Refresh
        </Button>
      </div>

      {canViewOthers && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant={activeTab === "mine" ? "default" : "outline"} onClick={() => setActiveTab("mine")}>
            My Tasks
          </Button>
          <Button size="sm" variant={activeTab === "others" ? "default" : "outline"} onClick={() => setActiveTab("others")}>
            Assigned to Others
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex min-h-75 items-center justify-center py-12 text-muted-foreground">Loading…</div>
        ) : allTasks.length === 0 ? (
          <div className="min-h-75 py-8 text-center text-muted-foreground">No tasks available</div>
        ) : (
          allTasks.map((task, index) => (
            <TaskItem key={task.id || index} data={task} taskStatuses={taskStatuses} onStatusUpdate={handleStatusUpdate} />
          ))
        )}
      </div>

      {allTasks.length > 0 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Link href="/settings/tasks-listings" className="text-sm font-medium text-primary hover:underline">
            See all
          </Link>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchTasks(page)}
                  disabled={loading}
                  className={`flex size-7 items-center justify-center rounded-md text-sm ${page === currentPage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-alt"
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
