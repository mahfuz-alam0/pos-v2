import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getMediaLinks(businessEntityId?: string | null) {
  try {
    const params = businessEntityId ? { businessEntityId } : {};
    const { data } = await ecomApi.get("/media-links/pos-user/media-links", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
