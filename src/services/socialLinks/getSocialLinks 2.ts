import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSocialLinks(businessEntityId?: string | null) {
  try {
    const params = businessEntityId ? { businessEntityId } : {};
    const { data } = await ecomApi.get("/social-links/pos-user/social-links", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
