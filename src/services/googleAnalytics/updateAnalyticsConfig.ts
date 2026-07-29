import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateAnalyticsConfig(payload: { analyticsId: string; analyticsIdNumber: string }) {
  try {
    const { data } = await ecomApi.put("/google-analytics-config/pos-user/update-google-analytics-config", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
