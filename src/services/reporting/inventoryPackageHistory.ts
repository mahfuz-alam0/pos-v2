import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchInventoryPackageHistory(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-package-history", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
