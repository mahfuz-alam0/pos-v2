import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAssociatedUoms(id, params = {}) {
  try {
    const { data } = await api.get("/uoms/list-all-associated", { params: { id, ...params } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
