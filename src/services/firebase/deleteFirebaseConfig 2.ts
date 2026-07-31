import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteFirebaseConfig(businessEntityId?: string | null) {
  try {
    const params = businessEntityId ? { businessEntityId } : {};
    const { data } = await ecomApi.delete("/firebase-config/pos-user/delete-firebase-config", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
