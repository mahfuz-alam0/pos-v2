import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function setCartMetaData(body) {
  try {
    const response = await api.put("/customer-queue/set-cart-meta-data", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
