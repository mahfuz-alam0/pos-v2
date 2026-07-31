import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchEmployeeGroupsList(params: Record<string, unknown> = {}) {
  try {
    const { data } = await api.get("/user-groups/list-scoped-user-groups", { params: { limit: 30, page: 1, ...params } });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
