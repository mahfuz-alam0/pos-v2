import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createEmployeeAccount(body: Record<string, unknown>) {
  try {
    const { data } = await api.post("/organization-accounts/create-account", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
