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

const LIMIT = 30;

export default function TaskList() {
  const { shopId } = useShop();
  const { hasRole } = usePermission();
  const canViewOthers = hasRole("BOTH");
  const [activeTab, setActiveTab] = useState("mine");
  const [allTasks, setAllTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } =
        activeTab === "others" && canViewOthers ? await fetchTasksList(LIMIT, 1) : await fetchMyTasksList(LIMIT, 1);
      setAllTasks(data?.data?.tasks || []);
    } catch (err) {
      console.error("Error fetching tasks:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, canViewOthers]);

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
    fetchTasks();
  }, [shopId, fetchTasks]);

  const handleStatusUpdate = async (taskId, statusId) => {
    await updateTaskStatus({ id: taskId, statusId, shopId });
    fetchTasks();
  };

  return (
    <div className="rounded-xl bg-component-bg shadow-md p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-normal text-text">Task List</h2>
        <Button className="h-10 px-3.5 text-sm" onClick={() => fetchTasks()}>
          Refresh
        </Button>
      </div>

      {canViewOthers && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant={activeTab === "mine" ? "default" : "outline"} onClick={() => setActiveTab("mine")}>
            My Tasks
          </Button>
          <Button size="sm" variant={activeTab === "others" ? "default" : "outline"} onClick={() => setActiveTab("others")}>
            Other Assigned Tasks
          </Button>
        </div>
      )}

      <div className="mt-4 max-h-100 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
        ) : allTasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No tasks available</div>
        ) : (
          allTasks.map((task, index) => (
            <TaskItem key={task.id || index} data={task} taskStatuses={taskStatuses} onStatusUpdate={handleStatusUpdate} />
          ))
        )}
      </div>

      {allTasks.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <Link href="/settings/tasks-listings" className="text-sm font-medium text-primary hover:underline">
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
