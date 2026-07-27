import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcCategories() {
  try {
    const { data } = await api.get("/categories/metrc-categories-dataset");
    return { data: data.data?.metrcCategories ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchMetrcPurchaseCategoryTypes() {
  try {
    const { data } = await api.get("/categories/metrc-purchase-category-types-dataset");
    return { data: data.data?.metrcPurchaseCategoryTypes ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
