import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listAllDeals() {
  try {
    const { data } = await api.get("/deals/list-all-deals", { params: { sortByAlpha: 1 } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
