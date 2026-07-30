import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteEmployeeGroup(id: string) {
  try {
    const { data } = await api.delete("/user-groups/delete-user-group", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
