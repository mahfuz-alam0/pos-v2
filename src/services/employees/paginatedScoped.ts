import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchScopedEmployeesPage(page: number, search: string) {
  try {
    const { data } = await api.get("/organization-accounts/list-scoped-employees", {
      params: { limit: 20, page, search },
    });
    const employees = data.data?.employees ?? [];
    return {
      items: employees.map((e: any) => ({ id: e.id, name: e.name || e.email })),
      totalPages: data.data?.paginationData?.totalPages ?? 1,
    };
  } catch (err) {
    handleApiError(err);
    return { items: [], totalPages: 1 };
  }
}
