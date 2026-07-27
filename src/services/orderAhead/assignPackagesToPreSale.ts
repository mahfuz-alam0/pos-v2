import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

const ENDPOINT_BY_SOURCE = {
  EXTERNAL: "/pre-sales/assign-packages-to-pre-sale",
  LEAFLY: "/pre-sales/leafly/assign-packages",
  WEEDMAPS: "/pre-sales/weedmaps/assign-packages",
};

export async function assignPackagesToPreSale(source, body) {
  try {
    const { data } = await api.put(ENDPOINT_BY_SOURCE[source] ?? ENDPOINT_BY_SOURCE.EXTERNAL, body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
