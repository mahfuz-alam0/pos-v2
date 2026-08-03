import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchInventoryReorder(shopId: string, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/reporting/inventory-reorder", {
      params: { shopId, ...params },
    });
    return { tableData: data.data?.data?.tableData ?? [], paginationData: data.data?.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
