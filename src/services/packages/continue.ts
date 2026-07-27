import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function continuePackage(
  id: string,
  shopId: string,
  isMetrc: boolean,
  shouldSyncWithMetrcToo?: boolean
) {
  try {
    const url = isMetrc
      ? "/platform-packages/cannabis-package/continue"
      : "/platform-packages/regular-package/continue";
    const params: Record<string, any> = { id, shopId };
    if (isMetrc) params.shouldSyncWithMetrcToo = shouldSyncWithMetrcToo;
    const { data } = await api.put(url, null, { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
