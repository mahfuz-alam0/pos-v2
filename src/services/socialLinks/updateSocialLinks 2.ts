import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateSocialLinks(payload: { links: { type: string; url: string }[]; businessEntityId?: string }) {
  try {
    const { data } = await ecomApi.put("/social-links/pos-user/update-social-links", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
