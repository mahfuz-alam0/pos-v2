import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Exact-match lookup by driving license or medical license.
export async function findCustomersByLicense({
  shopId,
  drivingLicense,
  medicalLicense,
}: {
  shopId: string
  drivingLicense?: string
  medicalLicense?: string
}) {
  try {
    const params: Record<string, any> = { shopPreference: shopId };
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

// Fuzzy lookup by "first:last:dob" info string. The API requires exactly 3
// colon-separated segments and only filters on the ones you fill in — an
// empty segment means "don't filter on this field", not "match empty
// string". A partial string like "first:" is 2 segments, not 3, which the
// API silently treats as malformed and returns everyone, so always emit
// all 3 rather than growing the string conditionally.
export async function findCustomersByInfoString({
  shopId,
  firstName,
  lastName,
  dob,
}: {
  shopId: string
  firstName?: string
  lastName?: string
  dob?: string
}) {
  try {
    if (!firstName && !lastName && !dob) return [];
    const infoString = `${(firstName ? String(firstName).toLowerCase() : "")}:${(lastName ? String(lastName).toLowerCase() : "")}:${dob || ""}`;

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
