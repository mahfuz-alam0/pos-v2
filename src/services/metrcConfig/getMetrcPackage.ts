import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcPackageData(shopId: string, query: string) {
  try {
    const { data } = await api.get("/metrc-packages/get-metrc-package-data", { params: { shopId, query } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
