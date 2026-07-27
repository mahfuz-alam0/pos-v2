import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function convertPackagesToWaste(body: Record<string, any>) {
  try {
    const { data } = await api.post("/platform-packages/metrc-oklahoma/convert-to-waste", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
