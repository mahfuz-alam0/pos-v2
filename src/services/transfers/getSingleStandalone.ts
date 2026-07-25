import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleStandaloneTransfer(id: string | number, shopId: string) {
  try {
    const { data } = await api.get("/standalone-transfers/single", { params: { id, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
