import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createSection(body: Record<string, any>) {
  try {
    const { data } = await ecomApiExternal.post("/sections/create", body);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
