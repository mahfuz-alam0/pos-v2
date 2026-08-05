export interface SectionRow {
  id: string | number;
  title: string;
  isDisabled: boolean;
  subject?: string | null;
  shopIds: (string | number)[];
  businessEntityId?: string | number | null;
  brands?: { id: string | number }[];
  categories?: { id: string | number }[];
  products?: { id: string | number }[];
  deals?: { id: string | number }[];
}
