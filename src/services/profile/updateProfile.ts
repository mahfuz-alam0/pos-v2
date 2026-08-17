import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export interface UpdateProfilePayload {
  name: string;
  countryCode: string | null;
  phone: string | null;
  avatarUrl: string | null;
  documentLinks: string[];
}

export async function updateProfile(payload: UpdateProfilePayload) {
  try {
    const { data } = await api.put("/organization-accounts/update-my-profile", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
