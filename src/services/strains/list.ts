import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchStrainsList(params: Record<string, any> = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/strains/list-strains", { params });
    return { data: data.data?.strains ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
