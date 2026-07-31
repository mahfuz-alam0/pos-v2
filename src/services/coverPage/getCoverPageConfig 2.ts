import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCoverPageConfig(shopId: string | number, businessEntityId?: string | null) {
  try {
    const params: Record<string, any> = { shopId };
    if (businessEntityId) params.businessEntityId = businessEntityId;
    const { data } = await api.get("/ecomm-cover-page-config/config", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
