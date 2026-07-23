import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateTaskStatus({ id, statusId, shopId }) {
  try {
    const { data } = await api.patch(`/tasks/update-task-status`, { statusId }, { params: { shopId, id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
