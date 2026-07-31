import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function rotateEmployeePassword(id: string, newPassword: string) {
  try {
    const { data } = await api.put("/organization-accounts/rotate-password", { id, newPassword });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
