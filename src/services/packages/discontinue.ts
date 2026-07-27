import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function discontinuePackage(
  id: string,
  shopId: string,
  isMetrc: boolean,
  shouldSyncWithMetrcToo?: boolean
) {
  try {
    const url = isMetrc
      ? "/platform-packages/cannabis-package/discontinue"
      : "/platform-packages/regular-package/discontinue";
    const params: Record<string, any> = { id, shopId };
    if (isMetrc) params.shouldSyncWithMetrcToo = shouldSyncWithMetrcToo;
    const { data } = await api.put(url, null, { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
