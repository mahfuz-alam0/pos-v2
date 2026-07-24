import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSalesNew(filters, shopId) {
  try {
    const url = `sales/list-sales?limit=30&page=1&shopId=${
      JSON.parse(localStorage.getItem("shopId")) ?? shopId
    }`;
    const response = await api.get(url);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
