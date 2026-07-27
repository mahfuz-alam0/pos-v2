import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deactivatePackage(id: string, shopId: string, isMetrc: boolean) {
  try {
    const url = isMetrc
      ? "/platform-packages/cannabis-package/deactivate"
      : "/platform-packages/regular-package/deactivate";
    const { data } = await api.put(url, null, { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
