import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteMetrcCredentials(shopId: string) {
  try {
    const { data } = await api.delete("/metrc-credentials/delete-credentials", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
