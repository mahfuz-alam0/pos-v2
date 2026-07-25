import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcAdjustmentReasons(shopId) {
  try {
    const { data } = await api.get("/metrc-packages/adjustment-reasons", { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function createMetrcBulkPackageAdjustments(body) {
  try {
    const { data } = await api.post("/metrc-packages/create-metrc-bulk-package-adjustments", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
