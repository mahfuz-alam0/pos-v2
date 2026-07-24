import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerQueueList(skip = 0, limit = 100, customerQueue = []) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/customer-queue/list?shopId=${shopId}&skip=${skip}&limit=${limit}`);
    const { customers, hasMore } = response.data.data;

    const filteredCustomers = customers.filter((customer) => !customer.isRemoved);
    const updatedQueue = [...customerQueue, ...filteredCustomers];

    if (hasMore) {
      return await getCustomerQueueList(updatedQueue.length, limit, updatedQueue);
    }
    return updatedQueue;
  } catch (err) {
    handleApiError(err);
  }
}
