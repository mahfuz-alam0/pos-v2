import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleStrain(id: string | number) {
  try {
    const { data } = await api.get("/strains/single-strain", { params: { id } });
    return { data: data.data?.strain };
  } catch (err) {
    handleApiError(err);
  }
}
