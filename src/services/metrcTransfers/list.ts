import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcTransfersList(shopId: string, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/metrc-transfers/list-transfers", { params: { shopId, ...params } });
    return { data: data.data?.transfers ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
