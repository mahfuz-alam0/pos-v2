import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeSession(id, shopId) {
  try {
    const { data } = await api.delete("/count-sessions/delete", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
