import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function attachPackageToProduct(body: Record<string, any>, isMetrc: boolean) {
  try {
    const url = isMetrc
      ? "/inventories/cannabis-package/attach-package-to-product"
      : "/inventories/regular-package/attach-package-to-product";
    const { data } = await api.post(url, body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function attachPackageWithSystem(body: Record<string, any>, isMetrc: boolean) {
  try {
    const url = isMetrc
      ? "/inventories/cannabis-package/attach-package-with-system"
      : "/inventories/regular-package/attach-package-with-system";
    const { data } = await api.post(url, body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
