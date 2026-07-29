import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleSupplier(id: string | number) {
  try {
    const { data } = await api.get("/suppliers/single-supplier", { params: { id } });
    return { data: data.data?.supplier };
  } catch (err) {
    handleApiError(err);
  }
}
