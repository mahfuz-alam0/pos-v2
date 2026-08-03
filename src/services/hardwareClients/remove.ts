import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeHardwareClient(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.delete("/hardware-client/web-admin/delete-print-client", {
      params: { id, shopId },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
