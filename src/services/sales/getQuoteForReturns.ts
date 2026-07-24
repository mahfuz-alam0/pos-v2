import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getQuoteForReturns(body) {
  try {
    const bodyData = {
      ...body,
      shopId: JSON.parse(localStorage.getItem("shopId")),
    };
    const response = await api.post(
      "/sale-returns/get-quote-for-returned-items",
      bodyData
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
