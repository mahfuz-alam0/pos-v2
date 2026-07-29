import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleBanner(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await ecomApiExternal.get("/banners/single-banner", { params: { id, shopId } });
    return data.data?.banner;
  } catch (err) {
    handleApiError(err);
  }
}
