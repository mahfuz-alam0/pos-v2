import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcUom(shopId: string) {
  try {
    const { data } = await api.get("/metrc-packages/get-available-active-uoms", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
