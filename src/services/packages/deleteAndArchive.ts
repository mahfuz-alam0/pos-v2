import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteAndArchivePackage(id: string, shopId: string, isMetrc: boolean) {
  try {
    const url = isMetrc
      ? "/platform-packages/cannabis-package/delete-and-archive"
      : "/platform-packages/regular-package/delete-and-archive";
    const { data } = await api.put(url, null, { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
