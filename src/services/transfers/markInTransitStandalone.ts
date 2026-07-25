import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function markStandaloneTransferInTransit(id: string | number, shopId: string) {
  try {
    const { data } = await api.put("/standalone-transfers/store-to-store/mark-in-transit", { id, shopId });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
