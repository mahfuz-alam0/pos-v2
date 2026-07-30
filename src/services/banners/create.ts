import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createBanner(body: Record<string, any>) {
  try {
    const { data } = await ecomApiExternal.post("/banners/create", body);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
