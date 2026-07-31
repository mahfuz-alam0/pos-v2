import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchCountryCodes() {
  try {
    const { data } = await api.get("/applicable-country-codes");
    return { data: data.data?.countryCodes ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
