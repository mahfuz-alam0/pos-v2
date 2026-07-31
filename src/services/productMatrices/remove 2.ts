import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeProductMatrix(id: string | number) {
  try {
    const { data } = await api.delete("/product-matrices/remove", { params: { id } });
    return data.data;
  } catch (err) {
    handleApiError(err);
  }
}
