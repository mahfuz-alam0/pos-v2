import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getAnalyticsConfig() {
  try {
    const { data } = await ecomApi.get("/google-analytics-config/pos-user/get-google-analytics-config");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
