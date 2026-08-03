import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMedicalVsNonMedicalSales(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/medical-vs-non-medical-sales", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
