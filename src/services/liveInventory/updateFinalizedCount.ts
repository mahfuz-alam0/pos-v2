import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateFinalizedCount(body) {
  try {
    const { data } = await api.put("/count-sessions/set-finalized-count-of-live-package", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
