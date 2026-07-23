import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Exact-match lookup by driving license or medical license.
export async function findCustomersByLicense({ shopId, drivingLicense, medicalLicense }) {
  try {
    const params = { shopPreference: shopId };
    if (drivingLicense) params.drivingLicense = drivingLicense;
    if (medicalLicense) params.medicalLicense = medicalLicense;
    const { data } = await api.get("/customers/list-customers-based-on-either-or", { params });
    const found = data?.data?.foundCustomers || [];
    // Entries may be wrapped as { customer }
    return found.map((c) => c?.customer || c);
  } catch (err) {
    try {
      handleApiError(err);
    } catch (e) {
      if (e.status === 404) return [];
      throw e;
    }
  }
}

// Fuzzy lookup by "first:last:dob" info string.
export async function findCustomersByInfoString({ shopId, firstName, lastName, dob }) {
  try {
    let infoString = "";
    if (firstName) infoString += `${String(firstName).toLowerCase()}:`;
    if (lastName) infoString += `${String(lastName).toLowerCase()}:`;
    if (dob && lastName) infoString += dob;
    if (!infoString) return [];

    const { data } = await api.get("/customers/list-customers", {
      params: { limit: 30, page: 1, infoString, shopPreference: shopId },
    });
    return data?.data?.customers || [];
  } catch (err) {
    try {
      handleApiError(err);
    } catch (e) {
      if (e.status === 404) return [];
      throw e;
    }
  }
}
