import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getEmployeeTotalWorkHours(params: {
  employeeId: string;
  startDate: string;
  endDate: string;
  shopId: string;
}) {
  try {
    const { data } = await api.get("/work-shifts/total-work-hours", { params });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
