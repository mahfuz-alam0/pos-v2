import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from old services/Customer getAllCustomers + the inline url.get in
// customerSearch.js. Returns { data: { data: { customers } } } shape unchanged.
export async function listCustomers(queryParams = {}) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/customers/list-customers`, {
      params: {
        limit: 100,
        sortByAlpha: 1,
        shopPreference: shopId,
        ...queryParams,
      },
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
