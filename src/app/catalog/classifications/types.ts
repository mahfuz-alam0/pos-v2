export interface ClassificationRow {
  id: string | number;
  name: string;
  details?: string | null;
  isMJ?: boolean;
  image?: string | null;
}

export interface CategoryRow {
  id: string | number;
  name: string;
  details?: string | null;
  colorCode?: string | null;
  image?: string | null;
  classificationId?: string | number;
  classification?: { id: string | number; name: string; isMJ?: boolean };
  metrcCategoryStringId?: string | null;
  metrcPurchaseCategoryStringId?: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  totalEntries: number;
  totalPages: number;
}
