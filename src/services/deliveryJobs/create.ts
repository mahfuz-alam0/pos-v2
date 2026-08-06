import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createDeliveryJob(body: {
  shopId: string | number;
  saleId: string | number;
  driverId: string | number;
  vehicleId: string | number;
  deliveryEstimationWindow: {
    departureTimestamp: string;
    estimatedArrivalTimestamp: string;
    plannedRoute?: string;
  };
}) {
  try {
    const { data } = await api.post("/delivery-jobs/create", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
