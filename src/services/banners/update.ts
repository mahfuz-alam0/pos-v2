import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateBanner(body: Record<string, any>) {
  try {
    const { data } = await ecomApiExternal.put("/banners/update", body);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
