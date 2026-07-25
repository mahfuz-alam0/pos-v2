import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createPackageAdjustment(body) {
  try {
    const { data } = await api.post("/single-package-adjustments/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
