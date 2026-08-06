export const BANNER_TABS = [
  { key: "HOME", label: "Home" },
  { key: "CATEGORIES", label: "Categories" },
  { key: "BRANDS", label: "Brands" },
] as const;

export type BannerType = (typeof BANNER_TABS)[number]["key"];

export interface BannerRow {
  id: string | number;
  imageUrl: string;
  title?: string | null;
  isDisabled: boolean;
  bannerDuration: number;
  bannerType: BannerType;
  subject?: string | null;
  shopIds: (string | number)[];
  businessEntityId?: string | number | null;
  brands?: { id: string | number }[];
  categories?: { id: string | number }[];
  products?: { id: string | number }[];
  deals?: { id: string | number }[];
}
