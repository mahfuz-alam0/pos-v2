import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateInventoryEcommStatus(body: {
  id: string | number;
  shopId: string | number;
  isDisabledFromIOSEcomm: boolean;
  isDisabledFromAndroidEcomm: boolean;
  isDisabledFromWEBEcomm: boolean;
}) {
  try {
    const { data } = await api.put("/inventories/change-ecomm-status", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
