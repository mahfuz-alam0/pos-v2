import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function setCustomerDeliveryLocations(
  customerId: string,
  deliveryLocations: any[],
) {
  try {
    const { data } = await api.put("/customers/set-delivery-locations", {
      customerId,
      deliveryLocations,
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
