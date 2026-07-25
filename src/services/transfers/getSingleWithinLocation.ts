import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleWithinLocationTransfer(id: string | number, shopId: string) {
  try {
    const { data } = await api.get("/in-store-transfers/single", { params: { id, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
