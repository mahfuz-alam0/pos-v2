import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSectionsList(businessEntityId?: string | null) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const params: Record<string, any> = { shopId };
    if (businessEntityId) params.businessEntityId = businessEntityId;
    const { data } = await ecomApiExternal.get("/sections/list-sections", { params });
    return { data: data.data?.sections ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
