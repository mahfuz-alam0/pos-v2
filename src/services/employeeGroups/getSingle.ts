import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleEmployeeGroup(id: string) {
  try {
    const { data } = await api.get("/user-groups/single-user-group", { params: { id } });
    return { data: data?.data?.userGroup };
  } catch (err) {
    handleApiError(err);
  }
}
