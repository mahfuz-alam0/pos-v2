export interface AttributeValue {
  value: string;
  valueId: string;
  valueRepresentation: string | null;
}

export interface AttributeRow {
  id: string | number;
  name: string;
  type: "COLOR" | "TEXT" | string;
  details?: string | null;
  createdAt?: string;
  values?: AttributeValue[];
}

export interface AssociatedAttribute {
  id: string | number;
  name: string;
  values: AttributeValue[];
}

export interface MatrixImage {
  url: string;
  order: number;
}

export interface AssociatedProduct {
  id: string;
  name: string;
  attributeValueMap?: Record<string, string>;
}

export interface TemplateRow {
  id: string | number;
  name: string;
  details?: string | null;
  createdAt?: string;
  images?: MatrixImage[];
  associatedAttributes?: AssociatedAttribute[];
  associatedProducts?: AssociatedProduct[];
}

export interface PaginationState {
  page: number;
  limit: number;
  totalEntries: number;
  totalPages: number;
}

export interface ProductCombination {
  [attributeName: string]: AttributeValue | string | undefined;
  productId?: string;
  productName?: string;
}
