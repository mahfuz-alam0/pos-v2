import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function convertPackage(body: Record<string, any>) {
  try {
    const { data } = await api.post("/platform-packages/regular-package/convert", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function convertMetrcPackage(body: Record<string, any>) {
  try {
    const { data } = await api.post("/platform-packages/convert-metrc-package", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
