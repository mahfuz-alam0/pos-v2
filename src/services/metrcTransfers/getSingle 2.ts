import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleMetrcTransfer(shopId: string, id: string | number) {
  try {
    const { data } = await api.get("/metrc-transfers/single-transfer", { params: { id, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
