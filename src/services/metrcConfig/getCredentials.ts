import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcCredentials(shopId: string) {
  try {
    const { data } = await api.get("/metrc-credentials/get-credentials", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
