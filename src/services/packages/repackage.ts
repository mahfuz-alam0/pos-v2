import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function repackageMetrcPackages(body: Record<string, any>) {
  try {
    const { data } = await api.post("/platform-packages/repackage-metrc-packages", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
