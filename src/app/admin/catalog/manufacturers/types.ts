export interface BrandRow {
  id: string | number;
  name: string;
  highlights?: string | null;
  details?: string | null;
  image?: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  totalEntries: number;
  totalPages: number;
}
