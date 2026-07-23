import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function searchCustomers({
  shopId,
  search,
  limit = 20,
}: {
  shopId?: string
  search?: string
  limit?: number
} = {}) {
  try {
    const params: Record<string, any> = { shopPreference: shopId, limit, sortByAlpha: 1 };
    if (search) {
      params.searchFieldName = "nameEither";
      params.searchFiledValue = search;
    }
    const { data } = await api.get("/customers/list-customers", { params });
    return { data: data?.data?.customers || [] };
  } catch (err) {
    handleApiError(err);
  }
}
