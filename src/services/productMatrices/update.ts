import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateProductMatrix(id: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/product-matrices/update", body, { params: { id } });
    return data.data;
  } catch (err) {
    handleApiError(err);
  }
}
