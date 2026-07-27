import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function reconcileMetrcPackages(body: {
  shopId: string | number;
  packages: {
    packagePlatformId: string;
    adjustedQuantity: number;
    reasonId: string;
    notes: string;
  }[];
}) {
  try {
    const { data } = await api.post("/metrc-packages/create-metrc-bulk-package-adjustments", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
