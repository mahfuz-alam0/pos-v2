// Normalizes existing catalog/customer services into the {id,name} shape
// MultiApiSelect expects, since their response envelopes aren't consistent
// with each other (some nest under data.data, some just data).
import { listCategories } from "@/services/classifications/listCategories";
import { fetchBrandsList } from "@/services/brands/list";
import { listFilteredProducts } from "@/services/products/listFilteredProducts";
import { fetchTagsList } from "@/services/tags/list";
import { listMinimalPackages } from "@/services/packages/listMinimal";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { listCustomerGroups } from "@/services/customers/listCustomerGroups";
import { searchCustomers } from "@/services/customers/search";

function getShopId() {
  try {
    return JSON.parse(localStorage.getItem("shopId") || "null");
  } catch {
    return null;
  }
}

export async function fetchCategoriesPage(page: number, search: string) {
  const res = await listCategories([
    { name: "limit", value: 30 },
    { name: "page", value: page },
    ...(search ? [{ name: "search", value: search }] : []),
  ]);
  const list = res?.data?.categories || [];
  return { items: list.map((c: any) => ({ id: c.id, name: c.name })), totalPages: res?.data?.paginationData?.totalPages || 1 };
}

export async function fetchBrandsPage(page: number, search: string) {
  const res = await fetchBrandsList({ page, limit: 30, ...(search ? { search } : {}) });
  const list = res?.data || [];
  return { items: list.map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages || 1 };
}

export async function fetchProductsPage(page: number, search: string) {
  const res = await listFilteredProducts([
    { name: "limit", value: 30 },
    { name: "page", value: page },
    ...(search ? [{ name: "search", value: search }] : []),
  ]);
  const list = res?.data?.data?.products || res?.data?.products || [];
  return {
    items: list.map((p: any) => ({ id: p.id, name: p.name })),
    totalPages: res?.data?.data?.paginationData?.totalPages || res?.data?.paginationData?.totalPages || 1,
  };
}

export async function fetchTagsPage(page: number, search: string) {
  const res = await fetchTagsList({ page, limit: 30, ...(search ? { search } : {}) });
  const list = res?.data || [];
  return { items: list.map((t: any) => ({ id: t.id, name: t.name })), totalPages: res?.paginationData?.totalPages || 1 };
}

export async function fetchPackagesPage(page: number, search: string) {
  const shopId = getShopId();
  const res = await listMinimalPackages(shopId, null, { page, limit: 30, ...(search ? { search } : {}) } as any);
  const list = res?.data?.data?.packages || res?.data?.packages || [];
  return {
    items: list.map((p: any) => ({ id: p.id, name: p.name || p.advertisedId || p.id })),
    totalPages: res?.data?.data?.paginationData?.totalPages || res?.data?.paginationData?.totalPages || 1,
  };
}

export async function fetchAllCustomerTypes() {
  const res = await listCustomerTypes();
  const list = res?.data?.data?.customerTypes || [];
  return list.map((t: any) => ({ id: t.id, name: t.name }));
}

export async function fetchAllCustomerGroups() {
  const res = await listCustomerGroups();
  const list = res?.data?.data?.customerGroups || [];
  return list.map((g: any) => ({ id: g.id, name: g.name }));
}

export async function fetchCustomersPage(page: number, search: string) {
  const res = await searchCustomers({ search, limit: 30 });
  const list = res?.data || [];
  return {
    items: list.map((c: any) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.id })),
    totalPages: 1,
  };
}
