import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTaskStatuses() {
  try {
    const { data } = await api.get("/tasks/available-task-statuses");
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
