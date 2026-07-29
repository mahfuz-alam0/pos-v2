import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleCustomerGroup(groupId: string | number) {
  try {
    const { data } = await api.get("/customer-groups/single-customer-group", { params: { groupId } });
    return { data: data.data?.customerGroup };
  } catch (err) {
    handleApiError(err);
  }
}
