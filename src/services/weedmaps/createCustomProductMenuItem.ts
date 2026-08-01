import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createCustomProductMenuItem({
  shopId,
  inventoryId,
  preferredWmBrandId,
  preferredWmCategoryId,
  preferredWmSubCategoryId,
}: {
  shopId: string;
  inventoryId: string;
  preferredWmBrandId?: string | number;
  preferredWmCategoryId?: string | number;
  preferredWmSubCategoryId?: string | number;
}) {
  try {
    const { data } = await api.post("/weedmaps/create-new-custom-product-menu-item", {
      shopId,
      inventoryId,
      preferredWmBrandId,
      preferredWmCategoryId,
      preferredWmSubCategoryId,
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
