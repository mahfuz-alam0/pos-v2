import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getApiKey(platform: "IOS" | "ANDROID" | "WEB") {
  try {
    const { data } = await ecomApiExternal.get("/api-keys/get-api-key", { params: { platform } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
