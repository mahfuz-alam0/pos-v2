import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleSection(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await ecomApiExternal.get("/sections/single-section", { params: { id, shopId } });
    return data.data?.section;
  } catch (err) {
    handleApiError(err);
  }
}
