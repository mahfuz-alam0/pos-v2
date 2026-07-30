import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateMediaLinks(payload: {
  mainLogoURL: string | null;
  footerLogoURL: string | null;
  faviconURL: string | null;
  businessEntityId?: string | null;
}) {
  try {
    const { data } = await ecomApi.put("/media-links/pos-user/update-media-links", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
