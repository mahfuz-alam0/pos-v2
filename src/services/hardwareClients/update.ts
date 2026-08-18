import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// GUESS — endpoint/payload not yet confirmed against the backend (mirrors the
// naming convention of list-all-print-clients / delete-print-client). Update
// once the real contract is known.
export async function updateHardwareClient(id: string, payload: { name?: string; jobType?: string }) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.put("/hardware-client/web-admin/update-print-client", { id, shopId, ...payload });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
