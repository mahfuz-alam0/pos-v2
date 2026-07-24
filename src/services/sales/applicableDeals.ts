import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function findApplicableDeals(body) {
  try {
    const response = await api.post("/deals/list-all-applicable-deals", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
