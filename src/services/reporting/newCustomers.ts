import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchNewCustomers(params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/reporting/get-new-customers-detail", { params });
    return { data: data.data?.data ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
