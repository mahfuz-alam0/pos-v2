import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createTask(data: unknown) {
  try {
    const { data: res } = await api.post("/tasks/create-task", data);
    return { data: res };
  } catch (err) {
    handleApiError(err);
  }
}
