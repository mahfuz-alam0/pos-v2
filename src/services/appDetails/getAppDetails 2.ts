import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getAppDetails(businessEntityId?: string | null) {
  try {
    const params = businessEntityId ? { businessEntityId } : {};
    const { data } = await ecomApi.get("/app-details/pos-user/get-app-details", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
