import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createShareMode(plainPin) {
  try {
    const { data } = await api.post("/organization-accounts/start-share-mode", { plainPin });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
