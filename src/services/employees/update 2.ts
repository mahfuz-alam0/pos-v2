import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateEmployeeAccount(body: Record<string, unknown>) {
  try {
    const { data } = await api.put("/organization-accounts/update", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
