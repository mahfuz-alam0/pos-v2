import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getFirebaseConfig(businessEntityId?: string | null) {
  try {
    const params = businessEntityId ? { businessEntityId } : {};
    const { data } = await ecomApi.get("/firebase-config/pos-user/get-firebase-config", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
