import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function saveCoverPageConfig(payload: {
  shopId: string | number;
  coverPageVisiblity: boolean;
  sections: Record<string, any>;
  webColor?: string | null;
  businessEntityId?: string | null;
}) {
  try {
    const { data } = await api.post("/ecomm-cover-page-config/config", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
