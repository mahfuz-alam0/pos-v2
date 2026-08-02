export interface CategoryOption {
  id: string;
  name: string;
  colorCode?: string;
}

export interface BrandOption {
  id: string;
  name: string;
}

export interface TagOption {
  id: string;
  name: string;
}

export interface ProductRow {
  id: string;
  name: string;
  matrixId?: string | null;
  category?: CategoryOption | null;
  brand?: BrandOption | null;
  tags?: (TagOption | string)[];
  [key: string]: any;
}

export interface ProductFilters {
  search: string;
  brandIds?: string | null;
  categoryIds?: string | null;
  tagIds?: string[] | null;
}

export interface PaginationState {
  limit: number;
  page: number;
  totalEntries: number;
  totalPages: number;
}
