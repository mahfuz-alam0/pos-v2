import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleBrand(id: string | number) {
  try {
    const { data } = await api.get("/brands/single-brand", { params: { id } });
    return { data: data.data?.brand };
  } catch (err) {
    handleApiError(err);
  }
}
