export interface StrainRow {
  id: string | number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  totalEntries: number;
  totalPages: number;
}
