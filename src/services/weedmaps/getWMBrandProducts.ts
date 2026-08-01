import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getWMBrandProducts({
  shopId,
  brand_id,
  search = "",
  page = 1,
  page_size = 20,
}: {
  shopId: string;
  brand_id: string | number;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  try {
    const { data } = await api.get("/weedmaps/brand-products", {
      params: { shopId, brand_id, search, page, page_size },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
