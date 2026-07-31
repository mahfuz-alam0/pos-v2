import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleRole(id: string) {
  try {
    const { data } = await api.get("/roles/single", { params: { id } });
    return { data: data?.data?.role };
  } catch (err) {
    handleApiError(err);
  }
}
