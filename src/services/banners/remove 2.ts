import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteBanner(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await ecomApiExternal.delete("/banners/delete", { params: { id, shopId } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
