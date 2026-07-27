import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from the Add Customer page's pre-create check: looks up existing
// customers sharing the entered driving/medical license before creating a
// new one, so staff can override the existing record instead of duplicating.
export async function findDuplicateCustomers({ drivingLicense, medicalLicense }) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/customers/list-customers-based-on-either-or`, {
      params: {
        drivingLicense: drivingLicense || undefined,
        medicalLicense: medicalLicense || undefined,
        shopPreference: shopId,
      },
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
