import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listDrawerSessions(params: Record<string, unknown>) {
  try {
    const { data } = await api.get("/transactions/drawers/list-sessions", { params });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
