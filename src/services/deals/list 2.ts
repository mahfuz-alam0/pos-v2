import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchDealsList(params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/deals/list-all-deals", { params });
    return { data: data.data?.deals ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
