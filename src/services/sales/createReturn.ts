import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createReturn(body) {
  try {
    const response = await api.post("/sale-returns/create-sale-returns", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
