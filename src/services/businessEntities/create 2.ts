import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createBusinessEntity(body: { name: string; associatedTenantIds: string[] }) {
  try {
    const { data } = await ecomApi.post("/business-entities/pos-user/create-business-entity", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
