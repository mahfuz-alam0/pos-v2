import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createBrandedProductMenuItem({
  shopId,
  inventoryId,
  wmProductId,
  brandId,
}: {
  shopId: string;
  inventoryId: string;
  wmProductId: string | number;
  brandId: string | number;
}) {
  try {
    const { data } = await api.post("/weedmaps/create-new-branded-product-menu-item", {
      shopId,
      inventoryId,
      wmProductId,
      brandId,
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
