import { ecomApiExternal } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateSection(body: Record<string, any>) {
  try {
    const { data } = await ecomApiExternal.put("/sections/update", body);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
