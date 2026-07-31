import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTaskPriorities() {
  try {
    const { data } = await api.get("/tasks/available-task-priorities", { params: { limit: 100, page: 1 } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
