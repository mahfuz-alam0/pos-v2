import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchUomList(params = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/uoms/list-all", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
