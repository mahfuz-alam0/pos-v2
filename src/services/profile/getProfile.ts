import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export interface MyProfile {
  id: string;
  email: string;
  name: string;
  countryCode: string | null;
  phone: string | null;
  avatarUrl: string | null;
  documentLinks: string[];
  username: string | null;
}

export async function getProfile() {
  try {
    const { data } = await api.get("/organization-accounts/my-profile");
    return (data?.data?.profile ?? null) as MyProfile | null;
  } catch (err) {
    handleApiError(err);
  }
}
