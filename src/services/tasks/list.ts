import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTasksList(limit, page) {
  try {
    const { data } = await api.get("/tasks/list-assigned-to-others", { params: { limit, page } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
