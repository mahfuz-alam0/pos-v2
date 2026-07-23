import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function checkOrganization(orgUsername) {
  try {
    const { data } = await api.get(
      "/organization-accounts/check-if-organization-functional",
      { params: { orgUsername } }
    );
    return data; // expected: { orgId, ... }
  } catch (err) {
    handleApiError(err);
  }
}
