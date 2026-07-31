import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listBusinessEntities() {
  try {
    const { data } = await ecomApi.get("/business-entities/pos-user/list-business-entities");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
