import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateBusinessEntity(body: { id: string; name: string; associatedTenantIds: string[] }) {
  try {
    const { data } = await ecomApi.put("/business-entities/pos-user/update-business-entity", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
