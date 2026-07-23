import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function addCustomerToQueue(body) {
  try {
    const { data } = await api.post("/customer-queue/add", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function addCustomerToQueueByQrToken({ shopId, token }) {
  try {
    const { data } = await api.post("/customer-queue/add-by-qr-token", { shopId, token });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
