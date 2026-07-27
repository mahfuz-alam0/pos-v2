import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function activatePackage(id: string, shopId: string, isMetrc: boolean) {
  try {
    const url = isMetrc
      ? "/platform-packages/cannabis-package/activate"
      : "/platform-packages/regular-package/activate";
    const { data } = await api.put(url, null, { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
