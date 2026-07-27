import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getQuoteForSales(body) {
  try {
    const bodyData = {
      ...body,
      shopId: JSON.parse(localStorage.getItem("shopId")),
    };
    const response = await api.post("/sales/get-quote-for-physical-store", bodyData);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
