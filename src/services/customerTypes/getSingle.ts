import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleCustomerType(typeId: string | number) {
  try {
    const { data } = await api.get("/customer-types/single-customer-type", { params: { typeId } });
    return { data: data.data?.customerType };
  } catch (err) {
    handleApiError(err);
  }
}
