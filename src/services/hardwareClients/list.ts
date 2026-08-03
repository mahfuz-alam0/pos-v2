import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchHardwareClients(params: Record<string, any> = {}) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.get("/hardware-client/web-admin/list-all-print-clients", {
      params: { shopId, ...params },
    });
    return { data: data.data ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
