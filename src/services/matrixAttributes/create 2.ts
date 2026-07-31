import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createMatrixAttribute(body: Record<string, any>) {
  try {
    const { data } = await api.post("/matrix-attributes/create", body);
    return data.data;
  } catch (err) {
    handleApiError(err);
  }
}
