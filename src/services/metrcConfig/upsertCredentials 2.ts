import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function upsertMetrcCredentials(body: Record<string, unknown>) {
  try {
    const { data } = await api.post("/metrc-credentials/upsert-credentials", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
