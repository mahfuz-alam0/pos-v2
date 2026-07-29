import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateAppDetails(payload: Record<string, unknown>) {
  try {
    const { data } = await ecomApi.put("/app-details/pos-user/update-app-details", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
