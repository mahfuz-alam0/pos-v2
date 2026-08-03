import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getWMBrands({
  shopId,
  search = "",
  page = 1,
  page_size = 20,
}: {
  shopId: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  try {
    const { data } = await api.get("/weedmaps/brands", { params: { shopId, search, page, page_size } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
