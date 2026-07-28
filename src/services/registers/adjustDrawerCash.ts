import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function depositDrawerCash(body, id) {
  try {
    const response = await api.post(`/transactions/drawers/deposit-cash?id=${id}`, body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function withdrawDrawerCash(body, id) {
  try {
    const response = await api.post(`/transactions/drawers/withdraw-cash?id=${id}`, body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
