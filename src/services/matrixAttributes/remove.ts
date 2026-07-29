import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeMatrixAttribute(id: string | number) {
  try {
    const { data } = await api.delete("/matrix-attributes/remove", { params: { id } });
    return data.data;
  } catch (err) {
    handleApiError(err);
  }
}
