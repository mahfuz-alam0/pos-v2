import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAvailableMetrcPackageTags(shopId: string) {
  try {
    const { data } = await api.get("/metrc-packages/get-available-metrc-package-tags", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
