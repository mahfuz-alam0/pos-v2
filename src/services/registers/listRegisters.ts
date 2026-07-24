import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listRegisters(shopId) {
  try {
    const response = await api.get(`/registers/list?shopId=${shopId}`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
