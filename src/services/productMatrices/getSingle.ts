import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleProductMatrix(id: string | number) {
  try {
    const { data } = await api.get("/product-matrices/single-matrix", { params: { id } });
    return { data: data.data?.matrix };
  } catch (err) {
    handleApiError(err);
  }
}
