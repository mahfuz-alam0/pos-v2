import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Same source+deliveryMethod pipeline is shared by every card on the board,
// so without a cache one board render fires one identical request per card.
const cache = new Map();

export async function getOrderStatuses(source, deliveryMethod) {
  const key = `${source}|${deliveryMethod}`;
  if (cache.has(key)) return cache.get(key);

  const promise = (async () => {
    try {
      const response = await api.get(
        `/sales/available-sale-statuses?source=${source}&deliveryMethod=${deliveryMethod}`
      );
      return { data: response.data };
    } catch (err) {
      handleApiError(err);
      cache.delete(key);
    }
  })();

  cache.set(key, promise);
  return promise;
}
