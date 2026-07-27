import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleClassification(id: string | number) {
  try {
    const { data } = await api.get("/classifications/single-classification", { params: { id } });
    return { data: data.data?.classification };
  } catch (err) {
    handleApiError(err);
  }
}
