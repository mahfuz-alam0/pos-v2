import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeBusinessEntity(id: string) {
  try {
    const { data } = await ecomApi.delete("/business-entities/pos-user/delete-business-entity", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
