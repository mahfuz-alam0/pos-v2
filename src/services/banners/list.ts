import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchBannersList(businessEntityId?: string | null, bannerType?: string | null) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const params: Record<string, any> = { shopId };
    if (businessEntityId) params.businessEntityId = businessEntityId;
    if (bannerType) params.bannerType = bannerType;
    const { data } = await ecomApiExternal.get("/banners/list-banners", { params });
    return { data: data.data?.banners ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
