import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchEmployeesList({ limit = 30, page = 1, search = "" } = {}) {
  try {
    const { data } = await api.get("/organization-accounts/list-employees", {
      params: { sortByAlpha: 1, search, limit, page },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
