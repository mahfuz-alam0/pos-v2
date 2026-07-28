import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updatePackage(body: Record<string, any>) {
  try {
    const { data } = await api.put("/platform-packages/regular-package/update-limited", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function updateCannabisPackage(body: Record<string, any>) {
  try {
    const { data } = await api.put("/platform-packages/cannabis-package/update-limited", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
