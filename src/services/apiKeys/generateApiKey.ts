import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function generateApiKey(payload: { platform: "IOS" | "ANDROID" | "WEB"; apiKey: string; pin: string }) {
  try {
    const { data, status } = await ecomApiExternal.put("/api-keys/generate-api-key", payload);
    return { data, status };
  } catch (err) {
    handleApiError(err);
  }
}
