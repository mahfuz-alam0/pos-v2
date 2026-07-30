import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateEmployeeGroup(body: Record<string, unknown>) {
  try {
    const { data } = await api.put("/user-groups/update-user-group", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
