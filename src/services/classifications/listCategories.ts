import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";
import { generateAxiosParams } from "@/utils/axiosParams";

export async function listCategories(filters) {
  try {
    const response = await api.get(`/categories/list-categories`, {
      params: generateAxiosParams(filters),
    });
    return { data: response.data.data };
  } catch (err) {
    handleApiError(err);
  }
}
