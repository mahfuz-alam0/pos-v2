import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getDrawerSessionDetails(params: Record<string, unknown>) {
  try {
    const { data } = await api.get("/transactions/drawers/session-details", { params });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
