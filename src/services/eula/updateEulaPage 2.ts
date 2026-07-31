import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateEulaPage(payload: { type: string; title: string; description: string; contentHTML: string }) {
  try {
    const { data } = await ecomApi.put("/eula/pos-user/update-page", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
