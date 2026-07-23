import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMyTasksList(limit, page) {
  try {
    const { data } = await api.get("/tasks/list-my-tasks", { params: { limit, page } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
