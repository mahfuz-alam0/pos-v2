import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createEmployeeGroup(body: Record<string, unknown>) {
  try {
    const { data } = await api.post("/user-groups/create-user-group", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
