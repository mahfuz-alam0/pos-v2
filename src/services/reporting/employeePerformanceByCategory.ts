import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchEmployeePerformanceByCategory(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-employee-performance-by-category", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
