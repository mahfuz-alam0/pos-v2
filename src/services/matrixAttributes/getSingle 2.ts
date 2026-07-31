import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleMatrixAttribute(id: string | number) {
  try {
    const { data } = await api.get("/matrix-attributes/single-attribute", { params: { id } });
    return { data: data.data?.attribute };
  } catch (err) {
    handleApiError(err);
  }
}
