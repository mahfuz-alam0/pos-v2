import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateMatrixAttribute(id: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/matrix-attributes/update", body, { params: { id } });
    return data.data;
  } catch (err) {
    handleApiError(err);
  }
}
