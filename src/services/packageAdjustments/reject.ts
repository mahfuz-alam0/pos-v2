import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function rejectPackageAdjustment(body) {
  try {
    const { data } = await api.put("/single-package-adjustments/reject", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
