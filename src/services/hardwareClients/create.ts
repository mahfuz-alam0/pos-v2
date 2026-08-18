import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// GUESS — endpoint/payload not yet confirmed against the backend (mirrors the
// naming convention of list-all-print-clients / delete-print-client). Update
// once the real contract is known.
export async function createHardwareClient(payload: { name: string; jobType: string; shopId?: string | number }) {
  try {
    const shopId = payload.shopId ?? JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.post("/hardware-client/web-admin/create-print-client", { ...payload, shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
