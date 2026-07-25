import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSuppliersList(params: Record<string, any> = { limit: 30, page: 1 }) {
  try {
    const { data } = await api.get("/suppliers/list-suppliers", { params });
    return { data: data.data?.suppliers ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
