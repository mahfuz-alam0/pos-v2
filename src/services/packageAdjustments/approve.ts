import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function approvePackageAdjustment(body) {
  try {
    const { data } = await api.put("/single-package-adjustments/approve", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
