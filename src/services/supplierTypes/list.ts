import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSupplierTypes() {
  try {
    const { data } = await api.get("/supplierTypes/list-all-supplier-types");
    return { data: data.data?.supplierTypes ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
