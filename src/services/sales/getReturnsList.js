import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from old services/sales/getReturnsList (GetSalesReturns).
// filters: array of { name, value } (matches the old addQueryParams contract).
export async function getReturnsList(filters = []) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const params = { shopId };
    (filters || []).forEach((f) => {
      if (f?.name != null && f?.value != null && f.value !== "") {
        params[f.name] = f.value;
      }
    });
    const response = await api.get(`/sale-returns/list-sale-returns`, { params });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
