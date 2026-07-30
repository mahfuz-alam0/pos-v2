import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createProductMatrix(body: Record<string, any>) {
  try {
    const { data } = await api.post("/product-matrices/create", body);
    return data.data;
  } catch (err) {
    handleApiError(err);
  }
}
