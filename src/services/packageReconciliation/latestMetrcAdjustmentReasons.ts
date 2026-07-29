import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLatestMetrcAdjustmentReasons(shopId: string, packagePlatformIds: string[]) {
  try {
    const { data } = await api.get("/metrc-packages/get-latest-metrc-adjustment-reasons", {
      params: { shopId, packagePlatformIds },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
