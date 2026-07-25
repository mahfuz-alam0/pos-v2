import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPackageAdjustment(id, shopId) {
  try {
    const { data } = await api.get("/single-package-adjustments/single", { params: { id, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
