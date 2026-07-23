import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from old services/sales/getSingleReturn.
export async function getSingleReturn(shopId, id) {
  try {
    const response = await api.get(
      `/sale-returns/single-sale-return?shopId=${shopId}&id=${id}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
