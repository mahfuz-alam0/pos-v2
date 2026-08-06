import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function checkDeliveryAvailability(params: {
  shopId: string | number;
  zipCodeRegion: string;
  zipCode: string;
  lat: string | number;
  long: string | number;
}) {
  try {
    const { data } = await api.get(
      "/delivery-profiles/available-delivery-profile-data",
      { params },
    );
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
