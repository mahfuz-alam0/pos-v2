import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteAnalyticsConfig() {
  try {
    const { data } = await ecomApi.delete("/google-analytics-config/pos-user/delete-google-analytics-config");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
